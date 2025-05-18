// Unite Students Contract Checker Bot - vNext Attempt 15.2
// Increased NAVIGATION_TIMEOUT, changed waitUntil to 'load' for page.goto().
// SCRIPT VERSION 15.1 log is still present for deployment verification.
// DUMP_HTML_AFTER_ENSUITE_CLICK is true.

console.log("<<<<< SCRIPT VERSION 15.2 IS RUNNING - TOP OF FILE >>>>>"); // Updated version marker

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

// ---- MODIFIED TIMEOUTS ----
const NAVIGATION_TIMEOUT = 120000; // Increased to 120 seconds (2 minutes)
const PAGE_TIMEOUT = 150000;    // Also increased page timeout slightly
console.log("LOG POINT 4: After TIMEOUT consts. NAVIGATION_TIMEOUT set to:", NAVIGATION_TIMEOUT);

const DUMP_HTML_AFTER_ENSUITE_CLICK = process.env.DEBUG_HTML_DUMP === 'true' || true; 
console.log("LOG POINT 5: After DUMP_HTML const. DUMP_HTML_AFTER_ENSUITE_CLICK is:", DUMP_HTML_AFTER_ENSUITE_CLICK);

async function sendDiscordMessage(content) { /* ... (same as v15) ... */ }
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
    page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT); // Uses the new global const
    page.setDefaultTimeout(PAGE_TIMEOUT); // Uses the new global const
    
    await page.setRequestInterception(true);
    page.on('request', (request) => { /* ... (request interception - kept enabled) ... */ });

    console.log('Navigating to property page...');
    // ---- MODIFIED GOTO ----
    await page.goto(PROPERTY_URL, { waitUntil: 'load', timeout: NAVIGATION_TIMEOUT }); // timeout here overrides defaultNavTimeout for this call
    console.log('Page loaded (or at least load event fired)');
    
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
    
    // ... (Rest of the script from "Waiting for page to transition..." onwards is the same as v15) ...
    // This includes the "Attempting to locate general room type..."
    // The "ensuiteSuccess" click
    // The "Immediate HTML dump logic"
    // The "Extracting contract information..." with its internal try...catch
    // And the final processing of contracts or errors.
    
  } catch (error) {
    console.error('Error during check:', error.message, error.stack ? error.stack.substring(0,1000) : 'No stack'); 
    let errorDetails = `Error: ${error.message}\nStack: ${error.stack ? error.stack.substring(0,1000) : 'No stack'}`;
    if (page) { 
        try { 
            const currentUrl = await page.url(); 
            const currentTitle = await page.title(); 
            errorDetails += `\nURL: ${currentUrl}, Title: ${currentTitle}`; 
        } catch (e) {
            errorDetails += `\n(Could not get page URL/title for error report: ${e.message})`;
        }
    }
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
        console.log("<<<<< SCRIPT VERSION 15.2 - CHECKFORCONTRACTS INVOKED >>>>>"); 
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
console.log("<<<<< SCRIPT VERSION 15.2 HAS FINISHED PARSING - BOTTOM OF FILE >>>>>");
