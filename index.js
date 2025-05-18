// Unite Students Contract Checker Bot - vNext Attempt 15.1 (Deployment Verification)
// Added a top-level console.log to verify this version is running.
// Ensure puppeteer.launch options are correct.
// More robust wait and selectors for "Find a room" button.
// DUMP_HTML_AFTER_ENSUITE_CLICK is true.

console.log("<<<<< SCRIPT VERSION 15.1 IS RUNNING - TOP OF FILE >>>>>"); // ADDED FOR DEPLOYMENT VERIFICATION

// --- ENV VAR CHECK AT THE VERY TOP ---
console.log("--- INIT: ENV VAR CHECK (RAW) ---"); 
console.log("Raw process.env.DISCORD_WEBHOOK_URL:", process.env.DISCORD_WEBHOOK_URL);
console.log("Typeof raw process.env.DISCORD_WEBHOOK_URL:", typeof process.env.DISCORD_WEBHOOK_URL);
console.log("--- END INIT: ENV VAR CHECK (RAW) ---");

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const cron = require('node-cron');
const fetch = require('node-fetch'); 
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

const NAVIGATION_TIMEOUT = 75000; // Current timeout for page.goto
const PAGE_TIMEOUT = 100000;    
console.log("LOG POINT 4: After TIMEOUT consts");

const DUMP_HTML_AFTER_ENSUITE_CLICK = process.env.DEBUG_HTML_DUMP === 'true' || true; 
console.log("LOG POINT 5: After DUMP_HTML const. DUMP_HTML_AFTER_ENSUITE_CLICK is:", DUMP_HTML_AFTER_ENSUITE_CLICK);

async function sendDiscordMessage(content) {
  // ... (sendDiscordMessage using fetch - same as v15) ...
  const webhookUrl = DISCORD_WEBHOOK_URL_FROM_ENV;
  if (!webhookUrl || !webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
    console.warn(`Discord webhook URL appears invalid or is a placeholder. Current URL: "${webhookUrl}". Skipping notification.`);
    return;
  }
  const payload = { /* ... */ }; // Same payload structure
  try { /* ... */ } catch (error) { /* ... */ } // Same try-catch
}
console.log("LOG POINT 6: After sendDiscordMessage function definition (using fetch).");

async function waitForSelectorWithTimeout(page, selector, timeout = 10000) { /* ... (unchanged) ... */ }
console.log("LOG POINT 7: After waitForSelectorWithTimeout function definition");

async function enhancedClick(page, selectors, textContent, description = "element") { /* ... (unchanged from v15) ... */ }
console.log("LOG POINT 8: After enhancedClick function definition");

async function checkForContracts() {
  console.log(`[${new Date().toISOString()}] Running contract check...`);
  let browser = null;
  let page = null;
  
  try {
    console.log('Launching browser...');
    // ---- ENSURE CORRECT PUPPETEER LAUNCH OPTIONS (same as v15) ----
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
      protocolTimeout: 180000 
    });
    
    page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT); // Uses the global const
    page.setDefaultTimeout(PAGE_TIMEOUT);
    
    await page.setRequestInterception(true);
    page.on('request', (request) => { /* ... (request interception) ... */ });

    console.log('Navigating to property page...');
    await page.goto(PROPERTY_URL, { waitUntil: 'domcontentloaded' }); // This is line 132 in this version
    console.log('Page loaded');
    
    try { /* ... (cookie consent) ... */ } catch (e) { console.log('Minor error during cookie consent:', e.message); }
    
    // --- MORE ROBUST WAIT BEFORE "Find a room" (same as v15) ---
    console.log('Waiting for main page content to settle before finding "Find a room" button...');
    try { /* ... (wait for "Rooms available") ... */ } catch (e) { /* ... (warning and HTML dump if not found) ... */ }
    await page.waitForTimeout(2000); 
    // --- END MORE ROBUST WAIT ---

    console.log('Current page URL before Find a Room attempt:', await page.url());
    
    const findRoomSelectors = [ /* ... (same as v15) ... */ ];
    const findRoomSuccess = await enhancedClick(page, findRoomSelectors, 'Find a room', 'Find a room button');
    if (!findRoomSuccess) { /* ... (error handling and HTML dump from v15) ... */ throw new Error('Could not click "Find a room" button.'); }
    
    console.log('Waiting for page to transition after "Find a room" click...');
    await page.waitForTimeout(7000); 
    
    const urlAfterFindRoom = await page.url();
    const titleAfterFindRoom = await page.title();
    console.log('Current URL after Find Room and initial wait:', urlAfterFindRoom);
    console.log('Page title after Find Room and initial wait:', titleAfterFindRoom);

    console.log('Attempting to locate general room type selection interface (e.g., any button with data-room_type)...');
    if (!await waitForSelectorWithTimeout(page, 'button[data-room_type]', 35000)) { /* ... (error handling from v15) ... */ }
    console.log('General room type buttons interface appears to be ready.');

    const ensuiteSuccess = await enhancedClick(page, 
        ['button[data-room_type="ENSUITE"]', /* ... other selectors ... */], 
        'En-suite', 'Ensuite option'
    );
    if (!ensuiteSuccess) throw new Error('Could not click "Ensuite" option using enhancedClick.');
    
    // --- Immediate HTML dump logic (same as v15) ---
    console.log("Successfully clicked 'Ensuite'. Waiting a fixed 5 seconds for content to potentially load...");
    await page.waitForTimeout(5000); 
    const urlAfterEnsuite = await page.url();
    const titleAfterEnsuite = await page.title();
    console.log(`State after Ensuite click & 5s wait: URL: ${urlAfterEnsuite}, Title: ${titleAfterEnsuite}`);
    if (DUMP_HTML_AFTER_ENSUITE_CLICK) { /* ... (HTML dump logic - same as v15) ... */ }
    // --- End immediate HTML dump logic ---

    console.log('Now attempting to wait for "Reserve your room" span before contract extraction...');
    if (!await waitForSelectorWithTimeout(page, 'span ::-p-text(Reserve your room)', 20000)) { /* ... */ }
    await page.waitForTimeout(1000); 

    console.log(`Current page state for contract extraction: ${await page.title()} | URL: ${await page.url()}`);
    
    console.log('Extracting contract information...');
    const contractsData = await page.evaluate(() => { /* ... (contract extraction logic - same as v9/v10/v13/v15) ... */ });

    let contracts; /* ... (processing contractsData - same as v9/v10/v13/v15) ... */
    
    console.log('Final contracts variable:', JSON.stringify(contracts, null, 2));
    
    if (!contracts || contracts.length === 0) { /* ... (No details found message - same as v9/v10/v13/v15) ... */ } 
    else { /* ... (Process new contracts / standard only message - same as v9/10/v13/v15) ... */ }
    
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

// --- Health check and scheduling --- (unchanged)
// --- Startup Logic --- (unchanged, DUMP_HTML_AFTER_ENSUITE_CLICK controls it)
console.log("LOG POINT 13: Before Startup Logic (DUMP_HTML_AFTER_ENSUITE_CLICK is ON)");
if (DUMP_HTML_AFTER_ENSUITE_CLICK) { 
    console.log("HTML DUMP (Post-Ensuite) MODE IS ON - running checkForContracts once for debug.");
    (async () => {
        console.log("<<<<< SCRIPT VERSION 15.1 - CHECKFORCONTRACTS INVOKED >>>>>"); // ADDED FOR DEPLOYMENT VERIFICATION
        await checkForContracts();
        console.log("HTML DUMP (Post-Ensuite) debug run complete.");
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
console.log("<<<<< SCRIPT VERSION 15.1 HAS FINISHED PARSING - BOTTOM OF FILE >>>>>"); // ADDED FOR DEPLOYMENT VERIFICATION
