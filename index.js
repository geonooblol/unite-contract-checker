// Unite Students Contract Checker Bot - vNext Attempt 8
// Test 1: Commenting out node-fetch to diagnose early crash.

// --- ENV VAR CHECK AT THE VERY TOP ---
console.log("--- INIT: ENV VAR CHECK (RAW) ---");
console.log("Raw process.env.DISCORD_WEBHOOK_URL:", process.env.DISCORD_WEBHOOK_URL);
console.log("Typeof raw process.env.DISCORD_WEBHOOK_URL:", typeof process.env.DISCORD_WEBHOOK_URL);
console.log("--- END INIT: ENV VAR CHECK (RAW) ---");

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const cron = require('node-cron');
// const fetch = require('node-fetch'); // <<<< TEST 1: COMMENTED OUT
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
  // <<<< TEST 1: BODY OF FUNCTION COMMENTED OUT / GUARDED
  console.warn("TEST 1: sendDiscordMessage called, but node-fetch is commented out. No message will be sent.");
  console.log("Content title that would have been sent:", content.title);
  return; 
  /*
  const webhookUrl = DISCORD_WEBHOOK_URL_FROM_ENV;

  if (!webhookUrl || !webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
    console.warn(`Discord webhook URL appears invalid or is a placeholder. Current URL: "${webhookUrl}". Skipping notification.`);
    return;
  }
  // ... rest of fetch logic would go here ...
  */
}
console.log("LOG POINT 6: After sendDiscordMessage function definition");


async function waitForSelectorWithTimeout(page, selector, timeout = 10000) {
  // ... (function body unchanged)
  try {
    await page.waitForSelector(selector, { visible: true, timeout });
    return true;
  } catch (error) {
    return false;
  }
}
console.log("LOG POINT 7: After waitForSelectorWithTimeout function definition");

async function enhancedClick(page, selectors, textContent, description = "element") {
  // ... (function body unchanged)
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
  // ... (function body largely unchanged, but sendDiscordMessage calls will now just log)
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
      protocolTimeout: 180000 
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
        if (['font', 'image', 'media', 'stylesheet'].includes(resourceType) && !url.includes('essential')) { request.abort(); }
        else if (url.includes('analytics') || url.includes('tracking') || url.includes('hotjar') || url.includes('googletagmanager')) { request.abort(); }
        else { request.continue(); }
    });

    console.log('Navigating to property page...');
    await page.goto(PROPERTY_URL, { waitUntil: 'domcontentloaded' });
    console.log('Page loaded');
    
    try { /* ... (cookie consent) ... */ } catch (e) { console.log('Minor error during cookie consent:', e.message); }
    
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
        let currentUrlAtFailure = "unknown";
        let pageTitleAtFailure = "unknown";
        let pageContentSnapshot = "Could not get page content.";
        try {
            currentUrlAtFailure = await page.url();
            pageTitleAtFailure = await page.title();
            console.log(`DEBUG: URL at failure: ${currentUrlAtFailure}`);
            console.log(`DEBUG: Title at failure: ${pageTitleAtFailure}`);
            pageContentSnapshot = await page.content(); 
            console.log("DEBUG: Page HTML snapshot (first 3KB for console):", pageContentSnapshot.substring(0,3000));
            // DUMP_LIMIT and sendDiscordMessage calls are here, but sendDiscordMessage is neutered for this test
            await sendDiscordMessage({
                title: "ERROR - No Room Type Buttons", 
                description: `URL: ${currentUrlAtFailure}\nTitle: ${pageTitleAtFailure}\n\nPage HTML (start):\n\`\`\`html\n${pageContentSnapshot.substring(0, 1800)}\n\`\`\``, 
                color:0xFF0000
            });
        } catch (debugErr) {
            console.error("Error during debug info gathering (URL/title/content):", debugErr.message);
            await sendDiscordMessage({ title: "ERROR - Debug Info Gathering Failed", description: `Failed to get full debug info. Initial error was 'No room type buttons'. Debug attempt error: ${debugErr.message}`, color: 0xFF0000 });
        }
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
    const contracts = await page.evaluate(() => { /* ... (contract extraction logic) ... */ });
    
    console.log('Extracted contracts:', JSON.stringify(contracts, null, 2));
    
    if (!contracts || contracts.length === 0) { /* ... (No details found message) ... */ } 
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
if (process.env.ENABLE_HEALTH_CHECK === 'true') { 
  console.log("LOG POINT 10: Setting up Health Check");
  const http = require('http');
  const server = http.createServer((req, res) => { res.writeHead(200); res.end('Bot is running'); });
  const port = process.env.PORT || 3000;
  server.listen(port, () => console.log(`Health check server running on port ${port}`));
}
console.log("LOG POINT 11: After Health Check setup");

cron.schedule(CHECK_INTERVAL, checkForContracts, { scheduled: true, timezone: 'Europe/London' });
console.log("LOG POINT 12: After cron.schedule");


// --- Startup Logic ---
// DUMP_CONTRACT_SECTION_HTML_FOR_DEBUG is true for this run
console.log("LOG POINT 13: Before Startup Logic (HTML DUMP MODE IS ON)");
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
console.log("LOG POINT 14: After Startup Logic initiated");


process.on('SIGINT', () => { console.log('Bot shutting down...'); process.exit(0); });
process.on('uncaughtException', (err) => { console.error('Uncaught global exception:', err.message, err.stack); });
console.log("LOG POINT 15: Event listeners for SIGINT and uncaughtException set up. Script fully parsed.");
