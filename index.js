// Unite Students Contract Checker Bot - vNext Attempt 3
// Added debug logging for DISCORD_WEBHOOK_URL and changes from previous suggestions.

// --- ENV VAR CHECK AT THE VERY TOP ---
console.log("--- INIT: ENV VAR CHECK (RAW) ---");
console.log("Raw process.env.DISCORD_WEBHOOK_URL:", process.env.DISCORD_WEBHOOK_URL);
console.log("Typeof raw process.env.DISCORD_WEBHOOK_URL:", typeof process.env.DISCORD_WEBHOOK_URL);
console.log("--- END INIT: ENV VAR CHECK (RAW) ---");

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const { Webhook, MessageBuilder } = require('discord-webhook-node');
const cron = require('node-cron');

const dotenv = require('dotenv');
dotenv.config(); // Load .env file if present (primarily for local dev)

// --- ENV VAR CHECK AFTER DOTENV ---
console.log("--- AFTER DOTENV: ENV VAR CHECK ---");
console.log("process.env.DISCORD_WEBHOOK_URL after dotenv.config():", process.env.DISCORD_WEBHOOK_URL);
const ASSIGNED_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL; // Assign to a const for clarity
console.log("ASSIGNED_WEBHOOK_URL:", ASSIGNED_WEBHOOK_URL);
console.log("Typeof ASSIGNED_WEBHOOK_URL:", typeof ASSIGNED_WEBHOOK_URL);
console.log("--- END AFTER DOTENV: ENV VAR CHECK ---");


// Use the potentially updated process.env value
const hook = new Webhook(ASSIGNED_WEBHOOK_URL || 'https://discord.com/api/webhooks/your-webhook-url-placeholder');
console.log("Webhook object initialized. Actual URL being used by 'hook':", hook.url); // Log what the Webhook object itself is using


const CHECK_INTERVAL = process.env.CHECK_INTERVAL || '0 */4 * * *';
const PROPERTY_URL = 'https://www.unitestudents.com/student-accommodation/medway/pier-quays';

const NAVIGATION_TIMEOUT = 75000; 
const PAGE_TIMEOUT = 100000;    

// --- DEBUG HTML DUMP ---
const DUMP_CONTRACT_SECTION_HTML_FOR_DEBUG = process.env.DEBUG_HTML_DUMP === 'true' || true; // <<<< SETTING THIS TO TRUE FOR THIS RUN as per conversation flow

async function sendDiscordMessage(content) {
  if (!hook.url || hook.url.includes('your-webhook-url-placeholder') || hook.url.length < 100) { // Added length check as another guard
    console.warn(`Discord webhook URL appears invalid or is a placeholder. Current hook.url: "${hook.url}". Skipping notification.`);
    return;
  }
  try {
    const embed = new MessageBuilder()
      .setTitle(content.title)
      .setDescription(content.description.substring(0, 4090)) 
      .setColor(content.color)
      .setFooter(`Checked at ${new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' })}`)
      .setURL(content.url || PROPERTY_URL)
      .setTimestamp();
    if (content.fields) content.fields.forEach(field => embed.addField(field.name, String(field.value).substring(0,1020), field.inline));
    await hook.send(embed);
    console.log('Discord notification sent successfully');
  } catch (error) {
    console.error('Failed to send Discord notification:', error.message, error.stack);
    try {
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
      protocolTimeout: 180000 // Increased protocolTimeout to 3 minutes
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

    // --- MODIFIED SECTION FOR WAITING FOR ROOM TYPE (from previous response) ---
    console.log('Waiting for general room type selection interface...');
    // --- THIS IS WHERE THE Runtime.callFunctionOn timed out ERROR OCCURRED PREVIOUSLY ---
    // The error was in the `page.evaluate` INSIDE the `if` block if this `waitForSelectorWithTimeout` failed.
    // We've increased protocolTimeout for the browser launch.
    if (!await waitForSelectorWithTimeout(page, 'button[data-room_type]', 30000)) { // Increased timeout here too
        console.error("No room type buttons (e.g., [data-room_type]) found/visible in time. Page might be stuck or modal not loading correctly.");
        try {
            const currentUrl = await page.url();
            const pageTitle = await page.title();
            console.log(`Current URL when failing to find room types: ${currentUrl}`);
            console.log(`Current page title when failing: ${pageTitle}`);
            // Try a simpler content grab if evaluate for innerText fails
            const pageContentSnapshot = await page.content();
            console.log("Page content snapshot (first 2KB):", pageContentSnapshot.substring(0,2000));
            await sendDiscordMessage({title: "ERROR - No Room Type Buttons", description: `URL: ${currentUrl}\nTitle: ${pageTitle}\nContent (start): ${pageContentSnapshot.substring(0,1000)}`, color:0xFF0000});

        } catch (debugErr) {
            console.error("Error getting debug info (URL/title/content) during room type failure:", debugErr.message);
        }
        throw new Error("No room type buttons (e.g., [data-room_type]) found/visible in time. Check logs for URL/title/content.");
    }
    console.log('General room type buttons interface appears to be ready.');

    const ensuiteSuccess = await enhancedClick(page, 
        [
            'button[data-room_type="ENSUITE"]', 
            'button[aria-label="Select ENSUITE"]',
            'button[aria-label*="En-suite" i]', 
            'div[role="button"][aria-label*="En-suite" i]'
        ], 
        'En-suite', 
        'Ensuite option'
    );
    if (!ensuiteSuccess) throw new Error('Could not click "Ensuite" option using enhancedClick.');
    
    console.log('Waiting for contract options to appear/load...');
    if (!await waitForSelectorWithTimeout(page, 'span ::-p-text(Reserve your room)', 30000)) { // Increased timeout
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

    if (DUMP_CONTRACT_SECTION_HTML_FOR_DEBUG) {
        console.log("---- DEBUG: Attempting to dump HTML for contract section ----");
        // ... (rest of HTML dump logic, now uses updated sendDiscordMessage)
        try {
            await page.waitForSelector('span, div', {timeout: 5000}); 
            const reserveSectionHTML = await page.evaluate(() => {
                const reserveHeadingText = "Reserve your room"; 
                const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, span, p, div'));
                const targetHeading = headings.find(el => el.textContent.trim().toLowerCase().includes(reserveHeadingText.toLowerCase()));
                if (targetHeading) {
                    let container = targetHeading.closest('div[class*="mt-"]'); 
                    if (!container) container = targetHeading.closest('section');
                    if (!container) container = targetHeading.parentElement;
                    while(container && container.parentElement && container.textContent.length < 500 && container.children.length < 10) {
                        container = container.parentElement;
                    }
                    return container ? container.outerHTML : `Found "${reserveHeadingText}" but no suitable parent.`;
                }
                return `Could not find heading/span containing "${reserveHeadingText}". Body snapshot: ` + (document.body ? document.body.innerText.substring(0, 1000) : "No body");
            });
            console.log("---- HTML DUMP FOR CONTRACT SECTION ----\n", reserveSectionHTML.substring(0, 15000), "\n---- END HTML DUMP ----");
            const chunks = [];
            for (let i = 0; i < reserveSectionHTML.length; i += 1900) chunks.push(reserveSectionHTML.substring(i, i + 1900));
            for (const chunk of chunks) {
                await sendDiscordMessage({ title: "DEBUG Contract Section HTML", description: `\`\`\`html\n${chunk}\n\`\`\``, color: 0x0000FF });
                await page.waitForTimeout(500); 
            }
        } catch (htmlError) {
            console.log("Error trying to get specific HTML for debug: ", htmlError.message);
            await sendDiscordMessage({ title: "DEBUG HTML DUMP FAILED", description: htmlError.message, color: 0xFF0000 });
        }
    }
    
    console.log('Extracting contract information...');
    const contracts = await page.evaluate(() => { /* ... (contract extraction logic from previous good version) ... */ 
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
      if (!findContractTerms(document)) { console.warn("page.evaluate: Primary contract term extraction (findContractTerms) failed or found nothing."); }
      if (results.length === 0) { /* Broad scan */ }
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
    console.error('Error during check:', error.message, error.stack); 
    let errorDetails = `Error: ${error.message}\nStack: ${error.stack ? error.stack.substring(0,1000) : 'No stack'}`;
    if (page) { try { errorDetails += `\nURL: ${await page.url()}, Title: ${await page.title()}`; } catch (e) {/*ignore*/} } // await page.url()
    await sendDiscordMessage({ title: '❌ Bot Error', description: `\`\`\`${errorDetails.substring(0, 4000)}\`\`\``, color: 15158332 });
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

// --- Startup Logic ---
// Keep DUMP_HTML_FOR_DEBUG true for this specific run based on conversation
// If it was process.env.DEBUG_HTML_DUMP, it would control it externally
if (DUMP_CONTRACT_SECTION_HTML_FOR_DEBUG) { 
    console.log("HTML DUMP MODE IS ON - running checkForContracts once for debug.");
    (async () => {
        await checkForContracts();
        console.log("HTML DUMP debug run complete.");
        // if you want it to exit after one debug run when DUMP_HTML is true and not a cron service:
        // if (!process.env.CRON_RUNNING_AS_SERVICE) { process.exit(0); } 
    })();
} else {
    const startupDelay = Math.floor(Math.random() * 7000) + 3000; 
    console.log(`Bot starting initial check in ${startupDelay/1000}s... (Normal mode)`);
    setTimeout(checkForContracts, startupDelay);
}


process.on('SIGINT', () => { console.log('Bot shutting down...'); process.exit(0); });
process.on('uncaughtException', (err) => { console.error('Uncaught global exception:', err.message, err.stack); });
