// Optimized Unite Students Contract Checker Bot for Railway
// This version has improved stability on resource-constrained environments

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const minimalStealth = StealthPlugin();

// Disable the most resource-intensive evasions
minimalStealth.enabledEvasions.delete('sourceurl');
minimalStealth.enabledEvasions.delete('media.codecs');
minimalStealth.enabledEvasions.delete('navigator.plugins');
puppeteer.use(minimalStealth);

const cron = require('node-cron');
const fetch = require('node-fetch');
const dotenv = require('dotenv');
dotenv.config();

console.log("Unite Students Bot Starting - Railway Optimized Version");

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const CHECK_INTERVAL = process.env.CHECK_INTERVAL || '0 */4 * * *';
const PROPERTY_URL = 'https://www.unitestudents.com/student-accommodation/medway/pier-quays';

// Increased timeouts to handle container throttling
const INITIAL_GOTO_TIMEOUT = a90000;
const NAVIGATION_TIMEOUT = 180000;
const PAGE_TIMEOUT = 240000;
const PROTOCOL_TIMEOUT = 300000;

// Only dump HTML when debugging is explicitly enabled
const DUMP_HTML = process.env.DEBUG_HTML_DUMP === 'true';

async function sendDiscordMessage(content) {
  if (!DISCORD_WEBHOOK_URL || !DISCORD_WEBHOOK_URL.startsWith('https://discord.com/api/webhooks/')) {
    console.warn(`Invalid webhook URL. Skipping notification.`);
    return;
  }
  
  const payload = {
    username: "Unite Students Alert",
    embeds: [{
      title: content.title,
      description: String(content.description).substring(0, 4090),
      color: content.color,
      footer: { text: `Checked at ${new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' })}` },
      url: content.url || PROPERTY_URL,
      timestamp: new Date().toISOString()
    }]
  };
  
  if (content.fields && content.fields.length > 0) {
    payload.embeds[0].fields = content.fields.map(f => ({
      name: String(f.name).substring(0, 256),
      value: String(f.value).substring(0, 1024),
      inline: f.inline || false
    }));
  }
  
  try {
    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      timeout: 15000
    });
    
    if (!response.ok) {
      console.error(`Error sending Discord message: ${response.status} ${response.statusText}`);
    } else {
      console.log('Discord notification sent successfully');
    }
  } catch (error) {
    console.error('Exception sending Discord notification:', error.message);
  }
}

async function waitForSelector(page, selector, timeout = 15000) {
  try {
    await page.waitForSelector(selector, { visible: true, timeout });
    return true;
  } catch (error) {
    return false;
  }
}

async function clickElement(page, selectors, textContent, description = "element") {
  // Try selectors first
  for (const selector of Array.isArray(selectors) ? selectors : [selectors]) {
    try {
      console.log(`Trying to click ${description} with selector: ${selector}`);
      if (await waitForSelector(page, selector, 12000)) {
        await page.click(selector);
        console.log(`Clicked ${description} using: ${selector}`);
        await page.waitForTimeout(3000); // Wait for any page updates
        return true;
      }
    } catch (e) {
      console.log(`Failed to click ${selector}: ${e.message}`);
    }
  }
  
  // Try text content as fallback
  if (textContent) {
    try {
      console.log(`Trying to click ${description} by text: "${textContent}"`);
      
      const clicked = await page.evaluate((text) => {
        const elements = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
        const element = elements.find(el => el.textContent.trim().toLowerCase().includes(text.toLowerCase()));
        
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            element.click();
            return true;
          }
        }
        return false;
      }, textContent);
      
      if (clicked) {
        console.log(`Clicked ${description} by text content`);
        await page.waitForTimeout(3000);
        return true;
      }
    } catch (e) {
      console.log(`Failed to click by text: ${e.message}`);
    }
  }
  
  console.log(`Could not click ${description}`);
  return false;
}

async function checkForContracts() {
  console.log(`[${new Date().toISOString()}] Running contract check...`);
  let browser = null;
  let page = null;
  
  try {
    // First test site reachability with fetch
    console.log(`Testing site reachability...`);
    try {
      const testResponse = await fetch(PROPERTY_URL, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36' },
        timeout: 30000
      });
      console.log(`Site direct fetch status: ${testResponse.status}`);
    } catch (fetchError) {
      console.error(`Site fetch test failed: ${fetchError.message}`);
      await sendDiscordMessage({
        title: "❌ Site Connectivity Issue",
        description: `Failed to reach ${PROPERTY_URL}: ${fetchError.message}`,
        color: 0xFF0000
      });
    }

    // Launch browser with increased timeouts
    console.log('Launching browser...');
    browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--window-size=1366,768'
      ],
      protocolTimeout: PROTOCOL_TIMEOUT
    });
    
    page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36');
    
    page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT);
    page.setDefaultTimeout(PAGE_TIMEOUT);
    
    // Set up very minimal request interception - just block the most obvious trackers
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const url = request.url().toLowerCase();
      if (url.includes('analytics') || url.includes('tracking') || url.includes('facebook')) {
        request.abort();
      } else {
        request.continue();
      }
    });

    // Navigate to page
    console.log(`Navigating to property page...`);
    await page.goto(PROPERTY_URL, { 
      timeout: INITIAL_GOTO_TIMEOUT,
      waitUntil: ['domcontentloaded'] // Less strict than 'networkidle0'
    });
    
    console.log('Page loaded, URL:', await page.url());
    
    // Handle cookie consent if present
    try {
      const cookieSelector = '[id*="onetrust-accept"], [id*="accept-button"], button[data-testid*="accept"]';
      if (await waitForSelector(page, cookieSelector, 5000)) {
        await page.click(cookieSelector);
        console.log('Cookie consent handled');
        await page.waitForTimeout(1500);
      }
    } catch (e) {
      console.log('Cookie handling skipped:', e.message);
    }
    
    // Ensure main page has loaded before continuing
    console.log('Waiting for page to be ready...');
    await page.waitForTimeout(5000); // Give page some time to settle
    
    // Click "Find a room"
    console.log('Clicking "Find a room"...');
    const findRoomSelectors = [
      'button[data-event="book_a_room"][data-property="Pier Quays"]',
      'button[data-event="book_a_room"]'
    ];
    
    const findRoomClicked = await clickElement(page, findRoomSelectors, 'Find a room', 'Find a room button');
    if (!findRoomClicked) {
      throw new Error('Could not click "Find a room" button');
    }
    
    // Wait for room selection interface to load
    console.log('Waiting for room selection interface...');
    await page.waitForTimeout(10000); // Increased wait time
    
    // Click Ensuite option
    console.log('Selecting Ensuite room...');
    const ensuiteSelectors = [
      'button[data-room_type="ENSUITE"]',
      'button[aria-label="Select ENSUITE"]',
      'button[id="room-option-card"]'
    ];
    
    const ensuiteClicked = await clickElement(page, ensuiteSelectors, 'En-suite', 'Ensuite option');
    if (!ensuiteClicked) {
      throw new Error('Could not click "Ensuite" option');
    }
    
    // Wait for contract details to appear
    console.log('Waiting for contract details...');
    await page.waitForTimeout(10000); // Longer wait for contract details
    
    // Extract contract information
    console.log('Extracting contract information...');
    const contracts = await page.evaluate(() => {
      try {
        const results = [];
        const contractElements = document.querySelectorAll('#pricing-option, div[role="radio"]');
        
        if (!contractElements || contractElements.length === 0) {
          return [{ error: "No contract elements found" }];
        }
        
        contractElements.forEach(element => {
          try {
            // Try to extract text content directly
            const text = element.textContent.trim();
            
            // Pattern matching for contract duration
            let weeks = text.match(/(\d+)\s*weeks?/i)?.[1] || 'Unknown';
            let dates = text.match(/(\d{2}\/\d{2}\/\d{2,4})\s*-\s*(\d{2}\/\d{2}\/\d{2,4})/)?.[0] || 'Unknown dates';
            let term = text.match(/(?:Full Year|Academic Year|Term|Semester)/i)?.[0] || 'Unknown term';
            let price = text.match(/£(\d+)/)?.[1] || 'Unknown price';
            
            results.push({
              weeks,
              dates,
              term,
              price,
              rawText: text.substring(0, 200) // Include raw text for debugging
            });
          } catch (innerError) {
            results.push({ error: `Error parsing contract: ${innerError.message}` });
          }
        });
        
        return results;
      } catch (evaluateError) {
        return [{ error: `Evaluation error: ${evaluateError.message}` }];
      }
    });
    
    console.log('Extracted contracts:', JSON.stringify(contracts, null, 2));
    
    // Analyze contracts
    if (!contracts || contracts.length === 0 || contracts[0].error) {
      await sendDiscordMessage({
        title: "⚠️ Contract Checking Issue",
        description: `Unable to find contract details.\nReason: ${contracts[0]?.error || "Unknown error"}`,
        color: 0xFFA500
      });
    } else {
      // Check for non-51 week contracts
      const nonStandardContracts = contracts.filter(c => c.weeks !== '51' && c.weeks !== 'Unknown');
      
      if (nonStandardContracts.length > 0) {
        // Found alternatives! Alert user
        await sendDiscordMessage({
          title: "🎉 Alternative Contract Options Found!",
          description: `Found ${nonStandardContracts.length} non-51 week contracts at Pier Quays!`,
          fields: nonStandardContracts.map(c => ({
            name: `${c.weeks} weeks (${c.term})`,
            value: `Dates: ${c.dates}\nPrice: £${c.price} per week`,
            inline: true
          })),
          color: 0x00FF00
        });
      } else {
        // Only standard contracts found
        console.log('No alternative contracts found this time');
        
        // Only send message if debugging is enabled
        if (DUMP_HTML) {
          await sendDiscordMessage({
            title: "Contract Check Completed",
            description: "Only standard 51-week contracts currently available",
            color: 0x0099FF
          });
        }
      }
    }
    
  } catch (error) {
    console.error('Error during check:', error.message);
    await sendDiscordMessage({
      title: '❌ Bot Error',
      description: `Error checking for contracts: ${error.message}`,
      color: 0xFF0000
    });
  } finally {
    if (browser) await browser.close();
    console.log('Check completed');
  }
}

// Run on schedule
cron.schedule(CHECK_INTERVAL, checkForContracts, {
  timezone: 'Europe/London'
});

// Initial run on startup with a small delay
console.log(`Bot starting initial check in 10 seconds...`);
setTimeout(checkForContracts, 10000);

// Handle shutdown
process.on('SIGINT', () => {
  console.log('Bot shutting down...');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err.message);
  sendDiscordMessage({
    title: "❌ CRITICAL ERROR",
    description: `Uncaught exception: ${err.message}`,
    color: 0xFF0000
  }).catch(e => console.error("Failed to send Discord message:", e));
});

console.log("Unite Students Contract Checker initialized and running");
