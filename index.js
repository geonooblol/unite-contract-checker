// Unite Students Contract Checker Bot - Enhanced Version
// Monitors for non-51-week ensuite contracts at Pier Quays
// More robust selectors and navigation handling

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const { Webhook, MessageBuilder } = require('discord-webhook-node');
const cron = require('node-cron');
const dotenv = require('dotenv');
dotenv.config();

// Discord webhook URL - Set this in your environment variables
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const hook = new Webhook(WEBHOOK_URL || 'https://discord.com/api/webhooks/your-webhook-url');

// Configuration
const CHECK_INTERVAL = process.env.CHECK_INTERVAL || '0 */4 * * *'; // Every 4 hours by default
const PROPERTY_URL = 'https://www.unitestudents.com/student-accommodation/medway/pier-quays';
const DEFAULT_CONTRACT = '51 weeks'; // The contract we want to avoid

// Set timeouts
const NAVIGATION_TIMEOUT = 60000; // 60 seconds (can be increased if needed, but waitUntil change is primary)
const PAGE_TIMEOUT = 90000; // 90 seconds

// Function to send discord messages
async function sendDiscordMessage(content) {
  try {
    const embed = new MessageBuilder()
      .setTitle(content.title)
      .setDescription(content.description)
      .setColor(content.color)
      .setFooter(`Checked at ${new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' })}`)
      .setURL(content.url || PROPERTY_URL)
      .setTimestamp();
    
    if (content.fields) {
      content.fields.forEach(field => {
        embed.addField(field.name, field.value, field.inline);
      });
    }
    
    await hook.send(embed);
    console.log('Discord notification sent successfully');
  } catch (error) {
    console.error('Failed to send Discord notification:', error.message);
    try {
      await hook.send(`**${content.title}**\n${content.description}`);
    } catch (err) {
      console.error('Failed to send even simplified Discord notification:', err.message);
    }
  }
}

// Helper function to wait for selectors with timeout
async function waitForSelectorWithTimeout(page, selector, timeout = 10000) {
  try {
    await page.waitForSelector(selector, { visible: true, timeout });
    return true;
  } catch (error) {
    console.log(`Selector not found within timeout: ${selector}`);
    return false;
  }
}

// Enhanced click function that tries multiple approaches
async function enhancedClick(page, selectors, textContent, description = "element") {
  // Try each provided selector
  for (const selector of Array.isArray(selectors) ? selectors : [selectors]) {
    try {
      console.log(`Attempting to click ${description} using selector: ${selector}`);
      const elementVisible = await waitForSelectorWithTimeout(page, selector);
      if (elementVisible) {
        await page.click(selector);
        console.log(`Successfully clicked ${description} using: ${selector}`);
        await page.waitForTimeout(3000); // Wait for action to process
        return true;
      }
    } catch (e) {
      console.log(`Failed to click ${description} using selector: ${selector}. Error: ${e.message}`);
    }
  }

  // Try clicking by text content if provided
  if (textContent) {
    try {
      console.log(`Attempting to click ${description} by text content: "${textContent}"`);
      
      const clicked = await page.evaluate((text) => {
        const elements = Array.from(document.querySelectorAll('button, a, div[role="button"], [class*="button"]'));
        let targetElement = null;
        
        targetElement = elements.find(el => el.textContent.trim().toLowerCase().includes(text.toLowerCase()));
        
        if (targetElement) {
          // Check visibility before clicking
          const rect = targetElement.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0 && getComputedStyle(targetElement).visibility !== 'hidden') {
            targetElement.click();
            return true;
          }
        }
        return false;
      }, textContent);
      
      if (clicked) {
        console.log(`Successfully clicked ${description} by text content`);
        await page.waitForTimeout(3000);
        return true;
      }
    } catch (e) {
      console.log(`Failed to click ${description} by text content: ${e.message}`);
    }
  }

  // Last resort - try to find any interactive element with a keyword from description
  if (description.includes(" ")) {
    const keywords = description.split(" ").map(k => k.toLowerCase()).filter(k => k.length > 2);
    try {
      console.log(`Trying keywords from description: ${keywords.join(", ")}`);
      
      const clicked = await page.evaluate((kws) => {
        const elements = Array.from(document.querySelectorAll('button, a, div[role="button"], [class*="button"]'));
        
        for (const keyword of kws) {
          const found = elements.find(el => {
            const elText = el.textContent.toLowerCase();
            const elAria = (el.getAttribute('aria-label') || '').toLowerCase();
            if (elText.includes(keyword) || elAria.includes(keyword)) {
                 const rect = el.getBoundingClientRect();
                 return rect.width > 0 && rect.height > 0 && getComputedStyle(el).visibility !== 'hidden';
            }
            return false;
          });
          if (found) {
            found.click();
            return `Clicked element containing "${keyword}"`;
          }
        }
        return false;
      }, keywords);
      
      if (clicked) {
        console.log(clicked);
        await page.waitForTimeout(3000);
        return true;
      }
    } catch (e) {
      console.log(`Keyword search for ${description} failed: ${e.message}`);
    }
  }

  console.log(`Could not click ${description} using any method`);
  return false;
}

// Main function to check for contracts
async function checkForContracts() {
  console.log(`[${new Date().toISOString()}] Running contract check...`);
  
  let browser = null;
  let page = null;
  
  try {
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
        '--disable-extensions',
        '--disable-gpu',
        '--window-size=1280,920'
      ]
    });
    
    page = await browser.newPage();
    
    await page.setViewport({ width: 1280, height: 920 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');
    page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT);
    page.setDefaultTimeout(PAGE_TIMEOUT); // General operations timeout
    
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      const url = request.url().toLowerCase();
      if (['font', 'image', 'media', 'stylesheet'].includes(resourceType) && !url.includes('essential')) { // Allow essential CSS/fonts
        request.abort();
      } else if (
        url.includes('analytics') || url.includes('tracking') || url.includes('google-analytics') ||
        url.includes('facebook.com') || url.includes('hotjar') || url.includes('googletagmanager')
      ) {
        request.abort();
      } else {
        request.continue();
      }
    });

    console.log('Navigating to property page...');
    // ** STEP 1 from previous advice was to change waitUntil here **
    await page.goto(PROPERTY_URL, { waitUntil: 'domcontentloaded' }); // Changed from networkidle2
    console.log('Page loaded');
    
    // Handle cookie consent
    try {
      console.log('Attempting to handle cookie consent...');
      // ** STEP 1 from latest instructions (cookie selectors & logic) **
      const cookieSelectors = [
        'button[id*="cookie"]',
        '[id*="onetrust-accept-btn"]',
        'button[data-testid*="accept"]',
        'button[aria-label*="Accept"]',
        'button[aria-label*="Allow"]',
        'button[class*="cookie"]',
        'button[class*="consent"]',
        '#hs-eu-confirmation-button'
      ];

      let clickedACookieButton = false;
      for (const selector of cookieSelectors) {
        const cookieBtn = await page.$(selector);
        if (cookieBtn) {
          try {
            await page.evaluate(btn => btn.scrollIntoViewIfNeeded(), cookieBtn); // Scroll into view
            await cookieBtn.click();
            console.log(`Clicked cookie consent button using selector: ${selector}`);
            await page.waitForTimeout(2000); // Give it a sec
            clickedACookieButton = true;
            break; 
          } catch (clickError) {
            console.log(`Found cookie button with ${selector} but click failed: ${clickError.message}`);
          }
        }
      }

      if (!clickedACookieButton) {
        console.log('No cookie button clicked via specific selectors, trying text-based search...');
        try {
          const clickedByText = await page.evaluate(() => {
            const keywords = ["accept all cookies", "accept cookies", "allow all", "i agree", "accept"];
            const buttons = Array.from(document.querySelectorAll('button, a[role="button"]'));
            for (const btn of buttons) {
              const text = btn.textContent.toLowerCase().trim();
              if (keywords.some(kw => text.includes(kw))) {
                const rect = btn.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0 && getComputedStyle(btn).visibility !== 'hidden') {
                    btn.click();
                    return true; 
                }
              }
            }
            return false; 
          });

          if (clickedByText) {
            console.log('Successfully clicked cookie consent button via text search.');
            await page.waitForTimeout(2000);
          } else {
            console.log('Could not find or click a cookie consent button via text search either.');
          }
        } catch (evalError) {
          console.log(`Error during text-based cookie button click: ${evalError.message}`);
        }
      }
    } catch (e) {
      console.log('Error during cookie consent handling:', e.message);
    }
    
    console.log('Current page URL:', page.url());
    
    const findRoomSuccess = await enhancedClick(
      page,
      [
        'button[data-event="book_a_room"]', // Primary selector
        'a[href*="book"][data-event="book_a_room"]', // If it's an anchor tag
        'button:has-text("Find a room")' // This :has-text is non-standard, relying on puppeteer-extra potentially
      ],
      'Find a room', // Text content fallback
      'Find a room button'
    );
    
    if (!findRoomSuccess) {
      console.log('Failed to click Find a room button, aborting this check.');
      throw new Error('Could not click "Find a room" button.'); // Critical step
    }
    
    await page.waitForTimeout(5000); // Wait for modal/navigation
    console.log('Current URL after Find Room:', page.url());

    // ** STEP 2 from latest instructions (wait for room selection page) **
    console.log('Waiting for room type selection interface to be ready...');
    try {
      await page.waitForSelector('button[data-room_type]', { visible: true, timeout: 20000 });
      console.log('Room type selection interface appears to be ready.');
    } catch (err) {
      console.warn(`Room type selection interface not clearly detected (waited for 'button[data-room_type]'): ${err.message}. Proceeding anyway.`);
    }
    // ** END OF STEP 2 **
    
    // Click on the Ensuite option
    // ** STEP 3 from latest instructions (clean up ensuite selectors) **
    const ensuiteSuccess = await enhancedClick(
      page,
      [
        'button[data-room_type="ENSUITE"]',
        'button[aria-label="Select ENSUITE"]',
        'button[id="room-option-card"][data-room_type="ENSUITE"]',
        'button[aria-label*="Ensuite" i]', // 'i' for case-insensitivity if supported by query handler
        'div[role="button"][aria-label*="Ensuite" i]',
      ],
      'En-suite', // Text content fallback
      'Ensuite option'
    );
    // ** END OF STEP 3 **
    
    if (!ensuiteSuccess) {
      console.log('Failed to click Ensuite option, trying to continue or check state...');
      const reserveVisible = await waitForSelectorWithTimeout(page, 'span:contains("Reserve your room")', 5000); // :contains non-standard
      if (!reserveVisible) {
         const pageContentForDebug = await page.content();
         console.log('Could not find reservation section either. Page state might be unexpected.');
         // console.log('Page content for debug:', pageContentForDebug.substring(0, 2000)); // Log snippet
         throw new Error('Could not navigate to or identify the room reservation section after failing to click ensuite.');
      }
    }
    
    console.log('Waiting for contract information to load...');
    await page.waitForTimeout(5000); 
    
    const currentUrl = page.url();
    const title = await page.title();
    console.log(`Current page for contract extraction: ${title} | URL: ${currentUrl}`);
    
    console.log('Extracting contract information...');
    const contracts = await page.evaluate(() => {
      const results = [];
      
      function findContractTerms() {
        // ** STEP 4 from latest instructions (fix contract extraction selector) **
        let reserveSection = null;
        const allSpans = Array.from(document.querySelectorAll('span'));
        const reserveSpan = allSpans.find(s => s.textContent.trim().toLowerCase() === "reserve your room");

        if (reserveSpan) {
          reserveSection = reserveSpan.closest('div[class*="mt-9"][class*="pb-"]');
          if (!reserveSection) {
            reserveSection = reserveSpan.parentElement.tagName === 'DIV' ? reserveSpan.parentElement : reserveSpan.closest('div');
          }
        } else {
          reserveSection = document.querySelector('div.mt-9.pb-'); 
          if (!reserveSection) {
              reserveSection = document.querySelector('div.mt-9');
          }
        }
        // ** END OF STEP 4 **

        if (reserveSection) {
          console.log('Found reserveSection'); // Browser console
          const pricingOptions = reserveSection.querySelectorAll('[role="radio"], div[id="pricing-option"], div[class*="pricing-option"]');
          
          if (pricingOptions && pricingOptions.length > 0) {
            console.log(`Found ${pricingOptions.length} pricing options`); // Browser console
            pricingOptions.forEach(option => {
              const text = option.textContent || '';
              const weekMatch = text.match(/(\d+)\s*weeks?/i);
              const term = weekMatch ? weekMatch[0] : 'Unknown term';
              const dateMatch = text.match(/\d{2}\/\d{2}\/\d{2,4}\s*-\s*\d{2}\/\d{2}\/\d{2,4}/); // Allow 2 or 4 digit year
              const dates = dateMatch ? dateMatch[0] : 'Unknown dates';
              
              let type = 'Unknown type';
              if (text.toLowerCase().includes('full year')) type = 'Full Year';
              else if (text.toLowerCase().includes('academic year')) type = 'Academic Year';
              else if (text.toLowerCase().includes('semester')) type = 'Semester';
              
              const priceMatch = text.match(/£(\d+(\.\d{2})?)/); // Capture pounds and pence
              const price = priceMatch ? `£${priceMatch[1]}` : 'Unknown price';
              
              results.push({ term, dates, type, price, rawText: text.substring(0,100) });
            });
          } else {
             console.log('No pricingOptions found in reserveSection'); // Browser console
          }
          return results.length > 0;
        } else {
            console.log('reserveSection not found'); // Browser console
        }
        return false;
      }
      
      if (!findContractTerms()) {
        // Fallback logic can be added here if needed
        console.log('Primary contract extraction failed, attempting fallback.'); // Browser console
      }
      
      return results;
    });
    
    console.log('Extracted contracts:', contracts);
    
    if (!contracts || contracts.length === 0) {
      console.log('No contract information found after evaluation.');
      const pageStateInfo = await page.evaluate(() => ({
          url: window.location.href,
          title: document.title,
          bodyTextStart: document.body ? document.body.innerText.substring(0, 500) : "No body"
      }));
      await sendDiscordMessage({
        title: '❓ Contract Check - No Details Found',
        description: `The bot couldn't find any contract information. This could mean no rooms are available, a site change, or an issue with selectors.\nPage: ${pageStateInfo.title}\nURL: ${pageStateInfo.url}`,
        color: 15105570, 
        url: page.url()
      });
    } else {
      const newContracts = contracts.filter(contract => 
        contract.term && 
        !contract.term.includes('51') && // Check against "51" not "51 weeks" to be broader
        contract.term !== 'Unknown term'  // Filter out truly unknown terms
      );
      
      if (newContracts.length > 0) {
        console.log('New contract options found!');
        await sendDiscordMessage({
          title: '🎉 New Contract Options Available!',
          description: 'Non-standard contract options have been found for ensuite rooms at Pier Quays!',
          color: 5814783, 
          fields: newContracts.map(contract => ({
            name: `${contract.term} (${contract.type})`,
            value: `📅 ${contract.dates}\n💰 ${contract.price}`,
            inline: false // Easier to read
          })),
          url: page.url()
        });
      } else {
        console.log('Only standard 51-week contracts (or no non-51 week) found.');
        if (process.env.SEND_STATUS_UPDATES === 'true') {
          await sendDiscordMessage({
            title: 'Contract Check Completed (Standard Only)',
            description: `Only standard 51-week contracts found, or no other options. Total contracts checked: ${contracts.length}. First found: ${contracts.length > 0 ? contracts[0].term : 'N/A'}`,
            color: 10197915,
            url: page.url()
          });
        }
      }
    }
    
  } catch (error) {
    console.error('Error during check:', error);
    let errorDetails = `Error: ${error.message}\nStack: ${error.stack}`;
    if (page) {
      try {
        errorDetails += `\nCurrent URL: ${page.url()}`;
        const title = await page.title().catch(() => 'Unknown Title');
        errorDetails += `\nPage title: ${title}`;
        const bodyContent = await page.evaluate(() => document.body ? document.body.innerText.substring(0, 1000) + '...' : 'No body content').catch(() => 'Could not extract body content');
        errorDetails += `\nPage content snippet: ${bodyContent}`;
      } catch (e) {
        errorDetails += `\nError getting page details for error report: ${e.message}`;
      }
    }
    await sendDiscordMessage({
      title: '❌ Bot Error',
      description: `The bot encountered an error:\n\`\`\`${errorDetails.substring(0, 1900)}\`\`\``, // Discord limit
      color: 15158332, 
    });
  } finally {
    if (browser) {
      console.log('Closing browser...');
      await browser.close();
    }
  }
}

// Health check endpoint
if (process.env.ENABLE_HEALTH_CHECK === 'true') {
  const http = require('http');
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running');
  });
  const port = process.env.PORT || 3000;
  server.listen(port, () => console.log(`Health check server running on port ${port}`));
}

// Schedule and initial run
cron.schedule(CHECK_INTERVAL, checkForContracts, { scheduled: true, timezone: 'Europe/London' });
const startupDelay = Math.floor(Math.random() * 10000) + 5000; // 5-15 seconds
console.log(`Unite Students Contract Checker Bot starting initial check in ${startupDelay/1000} seconds...`);
setTimeout(checkForContracts, startupDelay);

process.on('SIGINT', () => { console.log('Bot shutting down...'); process.exit(0); });
process.on('uncaughtException', (err) => { console.error('Uncaught exception:', err); });
