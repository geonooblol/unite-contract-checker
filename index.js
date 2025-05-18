// Unite Students Contract Checker Bot - vNext Attempt 10
// Corrected puppeteer.launch args.
// node-fetch is still commented out for this run.

// --- ENV VAR CHECK AT THE VERY TOP ---
console.log("--- INIT: ENV VAR CHECK (RAW) ---"); 
console.log("Raw process.env.DISCORD_WEBHOOK_URL:", process.env.DISCORD_WEBHOOK_URL);
console.log("Typeof raw process.env.DISCORD_WEBHOOK_URL:", typeof process.env.DISCORD_WEBHOOK_URL);
console.log("--- END INIT: ENV VAR CHECK (RAW) ---");

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const cron = require('node-cron');
// const fetch = require('node-fetch'); // <<<< TEST: STILL COMMENTED OUT
console.log("LOG POINT 0: node-fetch require line has been processed/commented.");


const dotenv = require('dotenv');
dotenv.config(); 
console.log("LOG POINT 0.5: dotenv.config() processed.");


const DISCORD_WEBHOOK_URL_FROM_ENV = process.env.DISCORD_WEBHOOK_URL; 
console.log("DISCORD_WEBHOOK_URL_FROM_ENV (would be used by fetch):", DISCORD_WEBHOOK_URL_FROM_ENV);
console.log("LOG POINT 1: Before CHECK_INTERVAL declaration");


const CHECK_INTERVAL = process.env.CHECK_INTERVAL || '0 */4 * * *';
console.log("LOG POINT 2: After CHECK_INTERVAL, before PROPERTY_URL");
const PROPERTY_URL = 'https://www.unitestudents.com/student-accommodation/medway/pier-quays';
console.log("LOG POINT 3: After PROPERTY_URL");

const NAVIGATION_TIMEOUT = 75000; 
const PAGE_TIMEOUT = 100000;    
console.log("LOG POINT 4: After TIMEOUT consts");

const DUMP_CONTRACT_SECTION_HTML_FOR_DEBUG = process.env.DEBUG_HTML_DUMP === 'true' || true; 
console.log("LOG POINT 5: After DUMP_HTML const");


async function sendDiscordMessage(content) {
  // <<<< TEST: BODY OF FUNCTION COMMENTED OUT / GUARDED
  console.warn("TEST: sendDiscordMessage called, but node-fetch is commented out. No message will be sent.");
  console.log("Content title that would have been sent:", content.title);
  if (content.description) console.log("Content description (start):", String(content.description).substring(0,100));
  return; 
}
console.log("LOG POINT 6: After sendDiscordMessage function definition");


async function waitForSelectorWithTimeout(page, selector, timeout = 10000) {
  try {
    await page.waitForSelector(selector, { visible: true, timeout });
    return true;
  } catch (error) {
    return false;
  }
}
console.log("LOG POINT 7: After waitForSelectorWithTimeout function definition");

async function enhancedClick(page, selectors, textContent, description = "element") {
  for (const selector of Array.isArray(selectors) ? selectors : [selectors]) {
    try {
      console.log(`Attempting to click ${description} using selector: ${selector}`);
      if (await waitForSelectorWithTimeout(page, selector, 10000)) { 
        await page.click(selector);
        console.log(`Successfully clicked ${description} using: ${selector}`);
        await page.waitForTimeout(4000); 
        return true;
      } else {
        console.log(`Selector ${selector} for ${description} not visible/found in time.`);
      }
    } catch (e) {
      console.log(`Failed to click ${description} using selector: ${selector}. Error: ${e.message}`);
    }
  }
  if (textContent) { /* ... (textContent click logic) ... */ }
  console.log(`Could not click ${description} using any provided method.`);
  return false;
}
console.log("LOG POINT 8: After enhancedClick function definition");


async function checkForContracts() {
  console.log(`[${new Date().toISOString()}] Running contract check...`);
  let browser = null;
  let page = null;
  
  try {
    console.log('Launching browser...');
    // ---- RESTORED PUPPETEER LAUNCH ARGS ----
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
        '--disable-gpu'
      ],
      protocolTimeout: 180000 
    });
    // ---- END RESTORED ARGS ----
    
    page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT);
    page.setDefaultTimeout(PAGE_TIMEOUT);
    
    await page.setRequestInterception(true);
    page.on('request', (request) => { 
        const resourceType = request.resourceType();
        const url = request.url().toLowerCase();
        if (['font', 'image', 'media', 'stylesheet'].includes(resourceType) && !url.includes('essential')) { request.abort(); }
        else if (url.includes('analytics') || url.includes('tracking') || url.includes('hotjar') || url.includes('googletagmanager')) { request.abort(); }
        else { request.continue(); }
    });

    console.log('Navigating to property page...');
    await page.goto(PROPERTY_URL, { waitUntil: 'domcontentloaded' });
    console.log('Page loaded');
    
    try { /* ... cookie consent ... */ } catch (e) { console.log('Minor error during cookie consent:', e.message); }
    
    console.log('Current page URL:', page.url());
    
    const findRoomSuccess = await enhancedClick(page, ['button[data-event="book_a_room"]'], 'Find a room', 'Find a room button');
    if (!findRoomSuccess) throw new Error('Could not click "Find a room" button.');
    
    console.log('Waiting for page to transition after "Find a room" click...');
    await page.waitForTimeout(7000); 
    
    const urlAfterFindRoom = await page.url();
    const titleAfterFindRoom = await page.title();
    console.log('Current URL after Find Room and initial wait:', urlAfterFindRoom);
    console.log('Page title after Find Room and initial wait:', titleAfterFindRoom);

    console.log('Attempting to locate general room type selection interface (e.g., any button with data-room_type)...');
    if (!await waitForSelectorWithTimeout(page, 'button[data-room_type]', 35000)) { 
        console.error("No room type buttons (e.g., [data-room_type]) found/visible in time even after extended wait.");
        // ... (debug info gathering and throw error - will call neutered sendDiscordMessage) ...
        throw new Error("No room type buttons (e.g., [data-room_type]) found/visible. Check console for page state dump details.");
    }
    console.log('General room type buttons interface appears to be ready.');

    const ensuiteSuccess = await enhancedClick(page, 
        ['button[data-room_type="ENSUITE"]', 'button[aria-label="Select ENSUITE"]', 'button[aria-label*="En-suite" i]', 'div[role="button"][aria-label*="En-suite" i]'], 
        'En-suite', 'Ensuite option'
    );
    if (!ensuiteSuccess) throw new Error('Could not click "Ensuite" option using enhancedClick.');
    
    console.log('Waiting for contract options to appear/load...');
    if (!await waitForSelectorWithTimeout(page, 'span ::-p-text(Reserve your room)', 30000)) { /* ... */ }
    await page.waitForTimeout(3000); 

    console.log(`On page for contract extraction: ${await page.title()} | URL: ${await page.url()}`);

    if (DUMP_CONTRACT_SECTION_HTML_FOR_DEBUG) { /* ... (HTML dump logic - will call neutered sendDiscordMessage) ... */ }
    
    console.log('Extracting contract information...');
    const contractsData = await page.evaluate(() => {
        try { // Internal try...catch for page.evaluate
            const results = []; 
            function findContractTerms(contextNode) {
                // ... (all your existing findContractTerms logic from v9) ...
                let reserveSection = null;
                const reserveRoomSpan = Array.from(contextNode.querySelectorAll('span')).find( s => s.textContent.trim().toLowerCase() === "reserve your room" );
                if (reserveRoomSpan && reserveRoomSpan.parentElement) { reserveSection = reserveRoomSpan.parentElement; }
                else { console.error("page.evaluate: Could not find 'Reserve your room' span or parent."); reserveSection = contextNode.querySelector('div.mt-9'); if(reserveSection && !reserveSection.textContent.toLowerCase().includes("reserve your room")) { reserveSection = null; } else if (reserveSection) { console.warn("page.evaluate: Used fallback 'div.mt-9'.");}}
                if (!reserveSection) { console.error("page.evaluate: `reserveSection` not identified."); return false; }
                const optionsContainer = reserveSection.querySelector('div[role="radiogroup"]');
                let actualContainerToQuery = optionsContainer;
                if (!optionsContainer) { console.warn("page.evaluate: `div[role=\"radiogroup\"]` not found. Checking reserveSection."); const directOptions = reserveSection.querySelectorAll('div[id="pricing-option"][role="radio"]'); if (directOptions.length > 0) { console.warn("page.evaluate: Using `reserveSection` as container."); actualContainerToQuery = reserveSection; } else { console.error("page.evaluate: No clear optionsContainer."); return false; }}
                if (!actualContainerToQuery) { console.error("page.evaluate: actualContainerToQuery is null."); return false; }
                const pricingOptions = actualContainerToQuery.querySelectorAll('div[id="pricing-option"][role="radio"]');
                if (pricingOptions && pricingOptions.length > 0) {
                    pricingOptions.forEach(option => {
                      const text = option.textContent || '';
                      const weekMatch = text.match(/(\d{1,2})\s*weeks?/i); const term = weekMatch ? weekMatch[0] : 'Unknown term';
                      const dateMatch = text.match(/\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\s*-\s*\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}/); const dates = dateMatch ? dateMatch[0] : 'Unknown dates';
                      let type = 'Unknown type'; if (text.toLowerCase().includes('full year')) type = 'Full Year'; else if (text.toLowerCase().includes('academic year')) type = 'Academic Year'; else if (text.toLowerCase().includes('semester')) type = 'Semester'; else if (weekMatch && parseInt(weekMatch[1]) < 40 && parseInt(weekMatch[1]) > 5 ) type = 'Partial Year / Semester';
                      const priceMatch = text.match(/£(\d+(\.\d{2})?)/); const price = priceMatch ? `£${priceMatch[1]}` : 'Unknown price';
                      if (term !== 'Unknown term') { results.push({ term, dates, type, price, rawText: text.substring(0,150).replace(/\s+/g, ' ') });}
                    }); return true; 
                } else { console.error("page.evaluate: No 'pricingOptions' found. Container HTML:", actualContainerToQuery.innerHTML.substring(0,500)); }
                return false;
            }
            if (!findContractTerms(document)) { console.warn("page.evaluate: Primary extraction (findContractTerms) failed/found nothing.");}
            if (results.length === 0) { console.warn("page.evaluate: Primary found 0. Trying broad scan."); /* ... broad scan ... */ }
            return { success: true, data: results, error: null, browserLogs: [] }; 
        } catch (e) {
            console.error("Error INSIDE page.evaluate for contract extraction:", e.toString(), e.stack); 
            return { success: false, data: [], error: e.toString() + "\nStack: " + (e.stack || 'No stack available') };
        }
    });

    let contracts;
    if (contractsData && contractsData.success) { 
        contracts = contractsData.data;
        console.log('Extracted contracts successfully from page.evaluate wrapper.');
    } else if (contractsData) { 
        console.error("Error reported from page.evaluate during contract extraction:", contractsData.error);
        contracts = []; 
        await sendDiscordMessage({ 
            title: "❌ Error During Contract Scraping (page.evaluate)",
            description: `Error: ${String(contractsData.error).substring(0,4000)}`,
            color: 0xFF0000
        });
    } else {
        console.error("Critical failure: page.evaluate for contract extraction returned undefined or an unexpected value.");
        contracts = []; 
        await sendDiscordMessage({
            title: "❌ Critical Error in page.evaluate",
            description: "The page.evaluate call for contract extraction did not return the expected object structure.",
            color: 0xFF0000
        });
    }
    
    console.log('Final contracts variable:', JSON.stringify(contracts, null, 2));
    
    if (!contracts || contracts.length === 0) { 
        if (!(contractsData && !contractsData.success)) { 
            await sendDiscordMessage({ title: '❓ Contract Check - No Details Found', description: `The bot couldn't find any contract information. (page.evaluate success: ${contractsData ? contractsData.success : 'N/A'})`, color: 15105570, url: await page.url() });
        }
    } 
    else { /* ... (Process new contracts / standard only message) ... */ }
    
  } catch (error) {
    console.error('Error during check:', error.message, error.stack ? error.stack.substring(0,1000) : 'No stack'); 
    let errorDetails = `Error: ${error.message}\nStack: ${error.stack ? error.stack.substring(0,1000) : 'No stack'}`;
    if (page) { /* ... (error details URL/Title) ... */ }
    await sendDiscordMessage({ title: '❌ Bot Error', description: `\`\`\`${errorDetails.substring(0, 4000)}\`\`\``, color: 15158332 });
  } finally {
    if (browser) { console.log('Closing browser...'); await browser.close(); }
  }
}
console.log("LOG POINT 9: After checkForContracts function definition");

// --- Health check and scheduling ---
// ... (unchanged)

// --- Startup Logic ---
// ... (unchanged, DUMP_HTML is true for this run)
console.log("LOG POINT 13: Before Startup Logic (HTML DUMP MODE IS ON)");
if (DUMP_CONTRACT_SECTION_HTML_FOR_DEBUG) { 
    console.log("HTML DUMP MODE IS ON - running checkForContracts once for debug.");
    (async () => {
        await checkForContracts();
        console.log("HTML DUMP debug run complete.");
    })();
} else { /* ... */ }
console.log("LOG POINT 14: After Startup Logic initiated");


process.on('SIGINT', () => { console.log('Bot shutting down...'); process.exit(0); });
process.on('uncaughtException', (err) => { console.error('Uncaught global exception:', err.message, err.stack); });
console.log("LOG POINT 15: Event listeners for SIGINT and uncaughtException set up. Script fully parsed.");
