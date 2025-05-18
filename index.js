// Unite Students Contract Checker Bot - vNext Attempt 12
// Re-enabled node-fetch, new waiting strategy for contract options, targeted HTML dump.
// DUMP_CONTRACT_SECTION_HTML_FOR_DEBUG is true for this run.

// --- ENV VAR CHECK AT THE VERY TOP ---
console.log("--- INIT: ENV VAR CHECK (RAW) ---"); 
console.log("Raw process.env.DISCORD_WEBHOOK_URL:", process.env.DISCORD_WEBHOOK_URL);
console.log("Typeof raw process.env.DISCORD_WEBHOOK_URL:", typeof process.env.DISCORD_WEBHOOK_URL);
console.log("--- END INIT: ENV VAR CHECK (RAW) ---");

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const cron = require('node-cron');
const fetch = require('node-fetch'); // Using node-fetch
console.log("LOG POINT 0: node-fetch require line has been processed.");


const dotenv = require('dotenv');
dotenv.config(); 
console.log("LOG POINT 0.5: dotenv.config() processed.");


const DISCORD_WEBHOOK_URL_FROM_ENV = process.env.DISCORD_WEBHOOK_URL; 
console.log("DISCORD_WEBHOOK_URL_FROM_ENV (to be used by fetch):", DISCORD_WEBHOOK_URL_FROM_ENV);
console.log("LOG POINT 1: Before CHECK_INTERVAL declaration");


const CHECK_INTERVAL = process.env.CHECK_INTERVAL || '0 */4 * * *';
console.log("LOG POINT 2: After CHECK_INTERVAL, before PROPERTY_URL");
const PROPERTY_URL = 'https://www.unitestudents.com/student-accommodation/medway/pier-quays';
console.log("LOG POINT 3: After PROPERTY_URL");

const NAVIGATION_TIMEOUT = 75000; 
const PAGE_TIMEOUT = 100000;    
console.log("LOG POINT 4: After TIMEOUT consts");

const DUMP_CONTRACT_SECTION_HTML_FOR_DEBUG = process.env.DEBUG_HTML_DUMP === 'true' || true; 
console.log("LOG POINT 5: After DUMP_HTML const. DUMP_HTML_FOR_DEBUG is:", DUMP_CONTRACT_SECTION_HTML_FOR_DEBUG);


async function sendDiscordMessage(content) {
  const webhookUrl = DISCORD_WEBHOOK_URL_FROM_ENV;
  if (!webhookUrl || !webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
    console.warn(`Discord webhook URL appears invalid or is a placeholder. Current URL: "${webhookUrl}". Skipping notification.`);
    return;
  }
  const payload = { /* ... (same as v11) ... */ };
  try { /* ... (same as v11) ... */ } catch (error) { /* ... (same as v11) ... */ }
}
console.log("LOG POINT 6: After sendDiscordMessage function definition (using fetch).");


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
  // ... (function body unchanged from v11) ...
  for (const selector of Array.isArray(selectors) ? selectors : [selectors]) {
    try {
      console.log(`Attempting to click ${description} using selector: ${selector}`);
      if (await waitForSelectorWithTimeout(page, selector, 10000)) { 
        await page.click(selector);
        console.log(`Successfully clicked ${description} using: ${selector}`);
        await page.waitForTimeout(4000); 
        return true;
      } else { console.log(`Selector ${selector} for ${description} not visible/found.`); }
    } catch (e) { console.log(`Failed to click ${description} with ${selector}: ${e.message}`); }
  }
  if (textContent) { /* ... */ }
  console.log(`Could not click ${description}.`);
  return false;
}
console.log("LOG POINT 8: After enhancedClick function definition");


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
        '--disable-gpu'
      ],
      protocolTimeout: 180000 
    });
    
    page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    // ... (useragent, timeouts, request interception - same as v11) ...
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
        // ... (debug info gathering and throw error - same as v11, will use active sendDiscordMessage) ...
        throw new Error("No room type buttons (e.g., [data-room_type]) found/visible. Check Discord for page state dump details.");
    }
    console.log('General room type buttons interface appears to be ready.');

    const ensuiteSuccess = await enhancedClick(page, 
        ['button[data-room_type="ENSUITE"]', 'button[aria-label="Select ENSUITE"]', 'button[aria-label*="En-suite" i]', 'div[role="button"][aria-label*="En-suite" i]'], 
        'En-suite', 'Ensuite option'
    );
    if (!ensuiteSuccess) throw new Error('Could not click "Ensuite" option using enhancedClick.');
    
    // ---- NEW WAITING STRATEGY AND HTML DUMP TARGET ----
    console.log('Waiting for specific contract pricing options to appear/load...');
    const pricingOptionSelector = 'div.mt-9 div[role="radiogroup"] div[id="pricing-option"][role="radio"]';
    console.log(`Attempting to wait for a pricing option element with selector: ${pricingOptionSelector}`);

    if (!await waitForSelectorWithTimeout(page, pricingOptionSelector, 35000)) { 
        console.error(`A specific pricing option element (${pricingOptionSelector}) was not found/visible in time.`);
        await sendDiscordMessage({
            title: "WARNING - Pricing Option Element Not Found Before Dump",
            description: `Could not find a specific pricing option element with selector: \`${pricingOptionSelector}\`. The 'Reserve your room' section might not have loaded its options correctly. Will still attempt HTML dump of 'div.mt-9'. URL: ${await page.url()}`,
            color: 0xFF8C00 // Orange for warning
        });
        // We don't throw an error here; let the HTML dump proceed with div.mt-9
    } else {
        console.log(`At least one pricing option element (${pricingOptionSelector}) is visible.`);
    }
    await page.waitForTimeout(2000); // Small extra pause

    console.log(`On page for contract extraction: ${await page.title()} | URL: ${await page.url()}`);

    if (DUMP_CONTRACT_SECTION_HTML_FOR_DEBUG) {
        console.log("---- DEBUG: Attempting to dump HTML for contract section (targeting div.mt-9) ----");
        await sendDiscordMessage({ title: "DEBUG HTML DUMP Active", description: "Attempting to grab HTML of 'div.mt-9' (contract section).", color: 0xFFFF00 });
        
        const dumpTargetSelector = 'div.mt-9'; // The container you confirmed
        try {
            console.log(`HTML DUMP: Waiting for main container "${dumpTargetSelector}" to ensure it exists before dumping.`);
            // Wait for it to be present, not necessarily fully visible if options inside are still loading
            await page.waitForSelector(dumpTargetSelector, { timeout: 10000 }); 

            const sectionHTML = await page.evaluate((selectorToDump) => {
                const targetElement = document.querySelector(selectorToDump);
                if (targetElement) {
                    return targetElement.outerHTML;
                }
                // This part of evaluate will only run if querySelector is null
                return `Could not find element with selector "${selectorToDump}" to dump its HTML. Body snapshot for context: ` + (document.body ? document.body.innerText.substring(0, 1000) : "No body");
            }, dumpTargetSelector); 

            console.log(`---- HTML DUMP FOR "${dumpTargetSelector}" (first 15KB for console) ----\n`, String(sectionHTML).substring(0, 15000), "\n---- END HTML DUMP ----");
            
            const htmlToDiscord = String(sectionHTML); // Ensure it's a string
            const chunks = [];
            for (let i = 0; i < htmlToDiscord.length; i += 1900) { // Max length for Discord embed description part
                chunks.push(htmlToDiscord.substring(i, i + 1900));
            }
            if (chunks.length === 0 && htmlToDiscord.length > 0) chunks.push(htmlToDiscord); // Handle case where it's less than 1900
            else if (chunks.length === 0) chunks.push("No HTML content found or element was null.");

            for (const chunk of chunks) {
                await sendDiscordMessage({ title: `DEBUG Contract Section HTML (${dumpTargetSelector})`, description: `\`\`\`html\n${chunk}\n\`\`\``, color: 0x0000FF });
                await page.waitForTimeout(500); 
            }
        } catch (htmlDumpError) {
            console.log(`Error trying to get specific HTML for debug of "${dumpTargetSelector}": `, htmlDumpError.message);
            await sendDiscordMessage({ title: "DEBUG HTML DUMP FAILED", description: `Selector: ${dumpTargetSelector}\nError: ${htmlDumpError.message}`, color: 0xFF0000 });
        }
    }
    // ---- END NEW WAITING STRATEGY AND HTML DUMP TARGET ----
    
    console.log('Extracting contract information...');
    const contractsData = await page.evaluate(() => {
        try { // Internal try...catch for page.evaluate (same as v9)
            const results = []; 
            function findContractTerms(contextNode) { /* ... (same as v9) ... */ }
            if (!findContractTerms(document)) { /* ... */ }
            if (results.length === 0) { /* ... broad scan ... */ }
            return { success: true, data: results, error: null, browserLogs: [] }; 
        } catch (e) {
            console.error("Error INSIDE page.evaluate for contract extraction:", e.toString(), e.stack); 
            return { success: false, data: [], error: e.toString() + "\nStack: " + (e.stack || 'No stack available') };
        }
    });

    let contracts; // ... (processing contractsData - same as v9) ...
    if (contractsData && contractsData.success) { contracts = contractsData.data; console.log('Extracted contracts successfully from page.evaluate wrapper.'); }
    else if (contractsData) { console.error("Error from page.evaluate:", contractsData.error); contracts = []; await sendDiscordMessage({ title: "❌ Error During Contract Scraping (page.evaluate)", description: `Error: ${String(contractsData.error).substring(0,4000)}`, color: 0xFF0000 }); }
    else { console.error("Critical failure: page.evaluate returned unexpected value."); contracts = []; await sendDiscordMessage({ title: "❌ Critical Error in page.evaluate", description: "page.evaluate did not return expected object.", color: 0xFF0000 });}
    
    console.log('Final contracts variable:', JSON.stringify(contracts, null, 2));
    
    if (!contracts || contracts.length === 0) { /* ... (No details found message - same as v9) ... */ } 
    else { /* ... (Process new contracts / standard only message - same as v9) ... */ }
    
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
