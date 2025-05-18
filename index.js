// Unite Students Contract Checker Bot - vNext Attempt 15.3
// page.goto() with NO waitUntil and shorter timeout, then immediate content check.
// SCRIPT VERSION 15.3 log is present for deployment verification.
// DUMP_HTML_AFTER_ENSUITE_CLICK is true (though may not be reached).

console.log("<<<<< SCRIPT VERSION 15.3 IS RUNNING - TOP OF FILE >>>>>"); 

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

// Using a specific shorter timeout for the initial goto test
const INITIAL_GOTO_TIMEOUT = 45000; // 45 seconds for the minimal goto attempt
const NAVIGATION_TIMEOUT = 120000; // General navigation timeout for other operations
const PAGE_TIMEOUT = 150000;    
console.log("LOG POINT 4: After TIMEOUT consts. INITIAL_GOTO_TIMEOUT set to:", INITIAL_GOTO_TIMEOUT);

const DUMP_HTML_AFTER_ENSUITE_CLICK = process.env.DEBUG_HTML_DUMP === 'true' || true; 
console.log("LOG POINT 5: After DUMP_HTML const. DUMP_HTML_AFTER_ENSUITE_CLICK is:", DUMP_HTML_AFTER_ENSUITE_CLICK);

async function sendDiscordMessage(content) { /* ... (same as v15.2) ... */ }
console.log("LOG POINT 6: After sendDiscordMessage function definition (using fetch).");

async function waitForSelectorWithTimeout(page, selector, timeout = 10000) { /* ... (unchanged) ... */ }
console.log("LOG POINT 7: After waitForSelectorWithTimeout function definition");

async function enhancedClick(page, selectors, textContent, description = "element") { /* ... (unchanged from v15.2) ... */ }
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
    // Default navigation timeout will be used by clicks/waits, but goto will use its own explicit timeout
    page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT); 
    page.setDefaultTimeout(PAGE_TIMEOUT); 
    
    // --- REQUEST INTERCEPTION IS KEPT ENABLED FOR NOW ---
    await page.setRequestInterception(true);
    page.on('request', (request) => { /* ... (request interception) ... */ });

    // ---- MODIFIED GOTO: NO waitUntil, SHORTER TIMEOUT ----
    console.log(`Navigating to property page (minimal wait test - ${INITIAL_GOTO_TIMEOUT}ms timeout)...`);
    let initialContentSnapshot = "No content snapshot taken yet.";
    let initialUrl = "unknown";
    let initialTitle = "unknown";

    try {
        await page.goto(PROPERTY_URL, { timeout: INITIAL_GOTO_TIMEOUT }); // NO waitUntil
        initialUrl = await page.url();
        initialTitle = await page.title();
        console.log(`page.goto() resolved (minimal wait). Current URL: ${initialUrl}, Title: ${initialTitle}`);

        console.log('Attempting to get page content snapshot immediately after minimal goto...');
        initialContentSnapshot = await page.content();
        console.log('Page content snapshot (first 2KB for console):', initialContentSnapshot.substring(0, 2000));
        
        // Send this initial snapshot to Discord
        const DUMP_LIMIT = 1800;
        await sendDiscordMessage({
            title: "DEBUG - Minimal Goto Snapshot",
            description: `URL: ${initialUrl}\nTitle: ${initialTitle}\n\nHTML (start):\n\`\`\`html\n${initialContentSnapshot.substring(0,DUMP_LIMIT)}\n\`\`\``,
            color: 0x2ECC71 // Green for this specific debug
        });
        if (initialContentSnapshot.length > DUMP_LIMIT) {
            await sendDiscordMessage({ title: "DEBUG - Minimal Goto Snapshot (cont.)", description: `\`\`\`html\n${initialContentSnapshot.substring(DUMP_LIMIT, DUMP_LIMIT*2)}\n\`\`\``, color: 0x2ECC71 });
        }

        console.log("Waiting for body tag to be present after minimal goto...");
        if (!await waitForSelectorWithTimeout(page, 'body', 15000)) { // Wait for body tag
            console.error("Page body tag did not become available after minimal goto. Content received was:", initialContentSnapshot.substring(0,500));
            throw new Error("Page body tag did not become available after minimal goto.");
        }
        console.log("Body tag found. Proceeding with page interaction attempts...");

    } catch (gotoError) {
        console.error(`Error during minimal page.goto() or initial content check: ${gotoError.message}`, gotoError.stack);
        await sendDiscordMessage({
            title: "❌ ERROR - Minimal Goto Failed",
            description: `page.goto (no waitUntil) failed or initial check failed: ${gotoError.message}\nURL attempted: ${PROPERTY_URL}\nSnapshot attempt: ${initialContentSnapshot.substring(0,500)}`,
            color: 0xFF0000
        });
        throw gotoError; // Re-throw to stop the script and trigger main catch
    }
    // ---- END MODIFIED GOTO ----
    
    try { /* ... (cookie consent, brief as before) ... */ } catch (e) { console.log('Minor error during cookie consent:', e.message); }
    
    console.log('Waiting for main page content to settle before finding "Find a room" button...');
    try { /* ... (wait for "Rooms available") ... */ } catch (e) { /* ... (warning and HTML dump if not found) ... */ }
    await page.waitForTimeout(2000); 
    
    console.log('Current page URL before Find a Room attempt:', await page.url());
    
    const findRoomSelectors = [ /* ... (same as v15) ... */ ];
    const findRoomSuccess = await enhancedClick(page, findRoomSelectors, 'Find a room', 'Find a room button');
    if (!findRoomSuccess) { /* ... (error handling and HTML dump from v15) ... */ throw new Error('Could not click "Find a room" button.'); }
    
    // ... (Rest of the script from "Waiting for page to transition..." onwards is the same as v15) ...
    
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
        console.log("<<<<< SCRIPT VERSION 15.3 - CHECKFORCONTRACTS INVOKED >>>>>"); 
        await checkForContracts();
        console.log("HTML DUMP (Post-Ensuite) debug run complete.");
    })();
} else { /* ... */ }
console.log("LOG POINT 14: After Startup Logic initiated");

process.on('SIGINT', () => { console.log('Bot shutting down...'); process.exit(0); });
process.on('uncaughtException', (err) => { console.error('Uncaught global exception:', err.message, err.stack); });
console.log("LOG POINT 15: Event listeners for SIGINT and uncaughtException set up. Script fully parsed.");
console.log("<<<<< SCRIPT VERSION 15.3 HAS FINISHED PARSING - BOTTOM OF FILE >>>>>");
