// Unite Students Contract Checker Bot - vNext Attempt 2
// Adjusted wait for room type interface.

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const { Webhook, MessageBuilder } = require('discord-webhook-node');
const cron = require('node-cron');
const dotenv = require('dotenv');
dotenv.config();

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const hook = new Webhook(WEBHOOK_URL || 'https://discord.com/api/webhooks/your-webhook-url-placeholder'); // Ensure a placeholder

const CHECK_INTERVAL = process.env.CHECK_INTERVAL || '0 */4 * * *';
const PROPERTY_URL = 'https://www.unitestudents.com/student-accommodation/medway/pier-quays';

const NAVIGATION_TIMEOUT = 75000; 
const PAGE_TIMEOUT = 100000;    

// --- DEBUG HTML DUMP ---
const DUMP_CONTRACT_SECTION_HTML_FOR_DEBUG = process.env.DEBUG_HTML_DUMP === 'true' || false; 

async function sendDiscordMessage(content) {
  if (!hook.url || hook.url.includes('your-webhook-url-placeholder')) {
    console.warn('Discord webhook URL is not configured or is a placeholder. Skipping notification.');
    return;
  }
  try {
    const embed = new MessageBuilder()
      .setTitle(content.title)
      .setDescription(content.description.substring(0, 4090)) // Discord limit for description
      .setColor(content.color)
      .setFooter(`Checked at ${new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' })}`)
      .setURL(content.url || PROPERTY_URL)
      .setTimestamp();
    if (content.fields) content.fields.forEach(field => embed.addField(field.name, field.value.substring(0,1020), field.inline)); // Limit field value
    await hook.send(embed);
    console.log('Discord notification sent successfully');
  } catch (error) {
    console.error('Failed to send Discord notification:', error.message, error.stack);
    try {
      // Fallback for very long messages or other errors
      const simplifiedDescription = content.description.length > 1900 ? content.description.substring(0,1900) + "..." : content.description;
      await hook.send(`**${content.title}**\n${simplifiedDescription}`);
    } catch (err) {
      console.error('Failed to send simplified Discord notification:', err.message);
    }
  }
}

async function waitForSelectorWithTimeout(page, selector, timeout = 10000) {
  try {
    await page.waitForSelector(selector, { visible: true, timeout });
    return true;
  } catch (error) {
    return false;
  }
}

async function enhancedClick(page, selectors, textContent, description = "element") {
  for (const selector of Array.isArray(selectors) ? selectors : [selectors]) {
    try {
      console.log(`Attempting to click ${description} using selector: ${selector}`);
      if (await waitForSelectorWithTimeout(page, selector, 7000)) {
        await page.click(selector);
        console.log(`Successfully clicked ${description} using: ${selector}`);
        await page.waitForTimeout(3500); 
        return true;
      } else {
        console.log(`Selector ${selector} for ${description} not visible/found in time.`);
      }
    } catch (e) {
      console.log(`Failed to click ${description} using selector: ${selector}. Error: ${e.message}`);
    }
  }
  if (textContent) { 
      try {
        console.log(`Attempting to click ${description} by text content: "${textContent}"`);
        const clicked = await page.evaluate((text) => {
          const elements = Array.from(document.querySelectorAll('button, a, div[role="button"], [class*="button"]'));
          const targetElement = elements.find(el => el.textContent.trim().toLowerCase().includes(text.toLowerCase()));
          if (targetElement) {
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
          await page.waitForTimeout(3500);
          return true;
        }
      } catch (e) {
        console.log(`Failed to click ${description} by text content: ${e.message}`);
      }
  }
  console.log(`Could not click ${description} using any provided method.`);
  return false;
}

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
        '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas', '--no-first-run', '--no-zygote',
        '--disable-gpu', '--window-size=1366,768'
      ],
      protocolTimeout: 120000 
    });
    
    page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT);
    page.setDefaultTimeout(PAGE_TIMEOUT);
    
    await page.setRequestInterception(true);
    page.on('request', (request) => { 
      const resourceType = request.resourceType();
      const url = request.url().toLowerCase();
      if (['font', 'image', 'media', 'stylesheet'].includes(resourceType) && !url.includes('essential')) {
        request.abort();
      } else if (url.includes('analytics') || url.includes('tracking') || url.includes('hotjar') || url.includes('googletagmanager')) {
        request.abort();
      } else {
        request.continue();
      }
    });

    console.log('Navigating to property page...');
    await page.goto(PROPERTY_URL, { waitUntil: 'domcontentloaded' });
    console.log('Page loaded');
    
    try {
      console.log('Attempting to handle cookie consent (quick check)...');
      const cookieSelector = '[id*="onetrust-accept-btn"], button[data-testid*="accept"]';
      if (await waitForSelectorWithTimeout(page, cookieSelector, 5000)) {
        await page.click(cookieSelector, {timeout: 5000});
        console.log('Potential cookie button clicked.');
        await page.waitForTimeout(1500);
      } else {
          console.log('No prominent cookie button found quickly.');
      }
    } catch (e) { console.log('Minor error during cookie consent:', e.message); }
    
    console.log('Current page URL:', page.url());
    
    const findRoomSuccess = await enhancedClick(page, ['button[data-event="book_a_room"]'], 'Find a room', 'Find a room button');
    if (!findRoomSuccess) throw new Error('Could not click "Find a room" button.');
    
    console.log('Waiting for URL to potentially change or modal to appear...');
    try {
        await page.waitForFunction(
            (initialUrl) => window.location.href !== initialUrl && window.location.href.includes('book=true'),
            { timeout: 7000 },
            page.url()
        );
        console.log('URL changed or book=true confirmed.');
    } catch (e) {
        console.log("URL didn't change as expected or timed out. Assuming modal on same page or dynamic content load.");
    }
    await page.waitForTimeout(4000); 
    console.log('Current URL after Find Room attempt:', page.url());

    // --- MODIFIED SECTION FOR WAITING FOR ROOM TYPE ---
    console.log('Waiting for general room type selection interface...');
    if (!await waitForSelectorWithTimeout(page, 'button[data-room_type]', 25000)) { // Wait for ANY room type button
        const bodyTextContent = await page.evaluate(() => document.body?.innerText.substring(0, 3000).replace(/\s+/g, ' ')); // Get clean text
        console.log("Page snippet if no room type buttons found:\n", bodyTextContent);
        throw new Error("No room type buttons (e.g., [data-room_type]) found/visible in time.");
    }
    console.log('General room type buttons interface appears to be ready.');

    const ensuiteSuccess = await enhancedClick(page, 
        [
            'button[data-room_type="ENSUITE"]', 
            'button[aria-label="Select ENSUITE"]',
            'button[aria-label*="En-suite" i]', // Case insensitive for aria-label
            'div[role="button"][aria-label*="En-suite" i]' // If it's a div acting as button
        ], 
        'En-suite', 
        'Ensuite option'
    );
    if (!ensuiteSuccess) throw new Error('Could not click "Ensuite" option using enhancedClick.');
    // --- END OF MODIFIED SECTION ---
    
    console.log('Waiting for contract options to appear/load...');
    if (!await waitForSelectorWithTimeout(page, 'span ::-p-text(Reserve your room)', 25000)) {
        const contentCheck = await page.content();
        if (!contentCheck.toLowerCase().includes("reserve your room")) {
             console.log("Page content snippet (Reserve your room not found):", contentCheck.substring(0,3000));
             throw new Error("'Reserve your room' text not found on page after clicking ensuite.");
        }
        console.log("'Reserve your room' text found broadly in page content, but not as a distinct visible span. Proceeding with caution.");
    } else {
        console.log("'Reserve your room' span confirmed visible.");
    }
    await page.waitForTimeout(3000); 

    console.log(`On page for contract extraction: ${await page.title()} | URL: ${page.url()}`);

    if (DUMP_CONTRACT_SECTION_HTML_FOR_DEBUG) { /* ... (HTML dump logic) ... */ }
    
    console.log('Extracting contract information...');
    const contracts = await page.evaluate(() => {
      const results = [];
      function findContractTerms(contextNode) {
        let reserveSection = null;
        const reserveRoomSpan = Array.from(contextNode.querySelectorAll('span')).find(
            s => s.textContent.trim().toLowerCase() === "reserve your room"
        );

        if (reserveRoomSpan && reserveRoomSpan.parentElement) {
            reserveSection = reserveRoomSpan.parentElement;
        } else {
            console.error("page.evaluate: Could not find 'Reserve your room' span or its parent.");
            reserveSection = contextNode.querySelector('div.mt-9'); 
            if(reserveSection && !reserveSection.textContent.toLowerCase().includes("reserve your room")) {
                reserveSection = null; 
            } else if (reserveSection) {
                 console.warn("page.evaluate: Found reserveSection using fallback 'div.mt-9'.");
            }
        }

        if (!reserveSection) {
             console.error("page.evaluate: `reserveSection` could not be definitively identified.");
             return false;
        }

        const optionsContainer = reserveSection.querySelector('div[role="radiogroup"]');
        let actualContainerToQuery = optionsContainer;

        if (!optionsContainer) {
            console.warn("page.evaluate: Could not find 'optionsContainer' (div[role=\"radiogroup\"]). Checking if reserveSection itself contains options.");
            const directOptions = reserveSection.querySelectorAll('div[id="pricing-option"][role="radio"]');
            if (directOptions.length > 0) {
                console.warn("page.evaluate: Using `reserveSection` as `optionsContainer`.");
                actualContainerToQuery = reserveSection;
            } else {
                 console.error("page.evaluate: No clear optionsContainer or direct options in reserveSection.");
                 return false; 
            }
        }
        
        const pricingOptions = actualContainerToQuery.querySelectorAll('div[id="pricing-option"][role="radio"]');
        if (pricingOptions && pricingOptions.length > 0) {
            pricingOptions.forEach(option => {
              const text = option.textContent || '';
              const weekMatch = text.match(/(\d{1,2})\s*weeks?/i);
              const term = weekMatch ? weekMatch[0] : 'Unknown term';
              const dateMatch = text.match(/\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\s*-\s*\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}/);
              const dates = dateMatch ? dateMatch[0] : 'Unknown dates';
              let type = 'Unknown type';
              if (text.toLowerCase().includes('full year')) type = 'Full Year';
              else if (text.toLowerCase().includes('academic year')) type = 'Academic Year';
              else if (text.toLowerCase().includes('semester')) type = 'Semester';
              else if (weekMatch && parseInt(weekMatch[1]) < 40 && parseInt(weekMatch[1]) > 5 ) type = 'Partial Year / Semester';
              const priceMatch = text.match(/£(\d+(\.\d{2})?)/);
              const price = priceMatch ? `£${priceMatch[1]}` : 'Unknown price';
              if (term !== 'Unknown term') {
                results.push({ term, dates, type, price, rawText: text.substring(0,150).replace(/\s+/g, ' ') });
              }
            });
            return true; 
        } else {
            console.error("page.evaluate: No 'pricingOptions' found using 'div[id=\"pricing-option\"][role=\"radio\"]'. Snippet:", actualContainerToQuery.innerHTML.substring(0,500));
        }
        return false;
      }
      
      if (!findContractTerms(document)) {
          console.warn("page.evaluate: Primary contract term extraction (findContractTerms) failed or found nothing.");
      }
      
      if (results.length === 0) { /* ... (Broad scan logic - unchanged) ... */ }
      return results;
    });
    
    console.log('Extracted contracts:', JSON.stringify(contracts, null, 2));
    
    if (!contracts || contracts.length === 0) {
      const pageStateInfo = await page.evaluate(() => ({ url: window.location.href, title: document.title }));
      await sendDiscordMessage({ title: '❓ Contract Check - No Details Found', description: `The bot couldn't find any contract information using primary or fallback methods.\nPage: ${pageStateInfo.title}\nURL: ${pageStateInfo.url}`, color: 15105570, url: page.url() });
    } else {
      const newContracts = contracts.filter(contract => 
        contract.term && !contract.term.toLowerCase().includes('51 week') && contract.term !== 'Unknown term'
      );
      if (newContracts.length > 0) {
         await sendDiscordMessage({
          title: '🎉 New Contract Options Available!',
          description: 'Non-standard contract options may have been found for ensuite rooms at Pier Quays!',
          color: 5814783, 
          fields: newContracts.map(contract => ({
            name: `${contract.term} (${contract.type})`,
            value: `📅 ${contract.dates}\n💰 ${contract.price}\nRaw: ${contract.rawText.substring(0,200)}`,
            inline: false
          })),
          url: page.url()
        });
      } else {
        if (process.env.SEND_STATUS_UPDATES === 'true') {
          await sendDiscordMessage({ title: 'Contract Check (Standard Only/None Found)', description: `Only standard 51-week options found, or no other options. Parsed: ${contracts.length > 0 ? contracts[0].rawText.substring(0,100)+'...' : '0 items'}.`, color: 10197915, url: page.url() });
        }
      }
    }
    
  } catch (error) {
    console.error('Error during check:', error.message, error.stack); // Log stack
    let errorDetails = `Error: ${error.message}\nStack: ${error.stack ? error.stack.substring(0,1000) : 'No stack'}`;
    if (page) { try { errorDetails += `\nURL: ${page.url()}, Title: ${await page.title()}`; } catch (e) {/*ignore*/} }
    await sendDiscordMessage({ title: '❌ Bot Error', description: `\`\`\`${errorDetails.substring(0, 4000)}\`\`\``, color: 15158332 }); // Allow longer error
  } finally {
    if (browser) { console.log('Closing browser...'); await browser.close(); }
  }
}

// --- Health check and scheduling ---
if (process.env.ENABLE_HEALTH_CHECK === 'true') { 
  const http = require('http');
  const server = http.createServer((req, res) => { res.writeHead(200); res.end('Bot is running'); });
  const port = process.env.PORT || 3000;
  server.listen(port, () => console.log(`Health check server running on port ${port}`));
}

cron.schedule(CHECK_INTERVAL, checkForContracts, { scheduled: true, timezone: 'Europe/London' });

if (!DUMP_CONTRACT_SECTION_HTML_FOR_DEBUG) {
    const startupDelay = Math.floor(Math.random() * 7000) + 3000; 
    console.log(`Bot starting initial check in ${startupDelay/1000}s...`);
    setTimeout(checkForContracts, startupDelay);
} else {
    console.log("HTML DUMP MODE IS ON - running checkForContracts once for debug.");
    (async () => {
        await checkForContracts();
        // console.log("HTML DUMP run complete. Exiting for debug mode.");
        // process.exit(0); 
    })();
}

process.on('SIGINT', () => { console.log('Bot shutting down...'); process.exit(0); });
process.on('uncaughtException', (err) => { console.error('Uncaught global exception:', err.message, err.stack); }); // Log stack
