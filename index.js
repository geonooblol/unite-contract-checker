// Unite Students Contract Checker Bot - vNext Attempt 15.4
// Test A: Basic fetch to Google.
// Test B: page.goto() for Unite with NO request interception & NO waitUntil.
// SCRIPT VERSION 15.4 log is present.
// DUMP_HTML_AFTER_ENSUITE_CLICK is true (though may not be reached).

console.log("<<<<< SCRIPT VERSION 15.4 IS RUNNING - TOP OF FILE >>>>>"); 

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

const INITIAL_GOTO_TIMEOUT = 45000; 
const NAVIGATION_TIMEOUT = 120000; 
const PAGE_TIMEOUT = 150000;    
console.log("LOG POINT 4: After TIMEOUT consts. INITIAL_GOTO_TIMEOUT set to:", INITIAL_GOTO_TIMEOUT);

const DUMP_HTML_AFTER_ENSUITE_CLICK = process.env.DEBUG_HTML_DUMP === 'true' || true; 
console.log("LOG POINT 5: After DUMP_HTML const. DUMP_HTML_AFTER_ENSUITE_CLICK is:", DUMP_HTML_AFTER_ENSUITE_CLICK);

async function sendDiscordMessage(content) { /* ... (same as v15.3) ... */ }
console.log("LOG POINT 6: After sendDiscordMessage function definition (using fetch).");

async function waitForSelectorWithTimeout(page, selector, timeout = 10000) { /* ... (unchanged) ... */ }
console.log("LOG POINT 7: After waitForSelectorWithTimeout function definition");

async function enhancedClick(page, selectors, textContent, description = "element") { /* ... (unchanged from v15.3) ... */ }
console.log("LOG POINT 8: After enhancedClick function definition");

async function checkForContracts() {
  console.log(`[${new Date().toISOString()}] Running contract check...`);
  let browser = null;
  let page = null;
  
  try {
    // ---- TEST A: Basic fetch to Google ----
    console.log("Attempting to fetch google.com as a basic network test...");
    let googleFetchOK = false;
    try {
        const googleResponse = await fetch('https://www.google.com', { timeout: 15000 }); // 15s timeout
        console.log(`Google fetch status: ${googleResponse.status}`);
        if (!googleResponse.ok) {
            console.error("Failed to fetch google.com, basic network issue might exist.");
            await sendDiscordMessage({title: "NETWORK TEST FAIL", description: `Could not fetch google.com. Status: ${googleResponse.status}`, color: 0xFF0000});
        } else {
            console.log("Successfully fetched google.com.");
            await sendDiscordMessage({title: "NETWORK TEST OK", description: "Successfully fetched google.com.", color: 0x00FF00});
            googleFetchOK = true;
        }
    } catch (fetchError) {
        console.error("Error fetching google.com:", fetchError.message);
        await sendDiscordMessage({title: "NETWORK TEST EXCEPTION", description: `Error fetching google.com: ${fetchError.message}`, color: 0xFF0000});
    }
    // if (!googleFetchOK) {
    //    throw new Error("Basic network test to Google failed. Aborting further checks."); // Optional: stop if basic connectivity fails
    // }
    // ---- END TEST A ----

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
    
    // ---- TEST B: Request Interception DISABLED for this goto test ----
    // await page.setRequestInterception(true); // <<<< DISABLED
    // page.on('request', (request) => { /* ... */ }); // <<<< DISABLED
    console.log("Request interception is DISABLED for this run.");


    console.log(`Navigating to property page (NO waitUntil, NO interception, ${INITIAL_GOTO_TIMEOUT}ms timeout)...`);
    let initialContentSnapshot = "No content snapshot taken yet.";
    let initialUrl = "unknown";
    let initialTitle = "unknown";

    try {
        await page.goto(PROPERTY_URL, { timeout: INITIAL_GOTO_TIMEOUT }); // NO waitUntil
        initialUrl = await page.url();
        initialTitle = await page.title();
        console.log(`page.goto() resolved. Current URL: ${initialUrl}, Title: ${initialTitle}`);

        console.log('Attempting to get page content snapshot immediately after goto...');
        initialContentSnapshot = await page.content();
        console.log('Page content snapshot (first 2KB for console):', initialContentSnapshot.substring(0, 2000));
        
        const DUMP_LIMIT = 1800;
        await sendDiscordMessage({
            title: "DEBUG - Goto (No Intercept/WaitUntil) Snapshot",
            description: `URL: ${initialUrl}\nTitle: ${initialTitle}\n\nHTML (start):\n\`\`\`html\n${initialContentSnapshot.substring(0,DUMP_LIMIT)}\n\`\`\``,
            color: 0x2ECC71 
        });
        if (initialContentSnapshot.length > DUMP_LIMIT) { /* ... send continuation ... */ }

        console.log("Waiting for body tag to be present after goto...");
        if (!await waitForSelectorWithTimeout(page, 'body', 15000)) { 
            console.error("Page body tag did not become available. Content:", initialContentSnapshot.substring(0,500));
            throw new Error("Page body tag did not become available after goto.");
        }
        console.log("Body tag found. Proceeding with page interaction attempts...");

    } catch (gotoError) {
        console.error(`Error during page.goto() (No Intercept/WaitUntil) or initial check: ${gotoError.message}`, gotoError.stack);
        await sendDiscordMessage({
            title: "❌ ERROR - Goto (No Intercept/WaitUntil) Failed",
            description: `page.goto (no intercept/waitUntil) failed: ${gotoError.message}\nURL: ${PROPERTY_URL}\nSnapshot: ${initialContentSnapshot.substring(0,500)}`,
            color: 0xFF0000
        });
        throw gotoError; 
    }
    // ---- END TEST B ----
    
    // Re-enable request interception if you were to proceed with clicks for a normal run
    // For this test, we might not reach further, but if we did, we'd need it back on.
    // For now, let's assume if goto fails, the script stops.

    // ... (The rest of your script: cookie handling, find room click, ensuite click, HTML dump, contract extraction)
    // This part will only run if the modified goto above succeeds.
    // For brevity, I'll omit the full rest of the script as it's unchanged from v15.3,
    // but it would start here with cookie handling.
    // If goto succeeds, the DUMP_HTML_AFTER_ENSUITE_CLICK will still be active.
    
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
        console.log("<<<<< SCRIPT VERSION 15.4 - CHECKFORCONTRACTS INVOKED >>>>>"); 
        await checkForContracts();
        console.log("HTML DUMP (Post-Ensuite) debug run complete.");
    })();
} else { /* ... */ }
console.log("LOG POINT 14: After Startup Logic initiated");

process.on('SIGINT', () => { console.log('Bot shutting down...'); process.exit(0); });
process.on('uncaughtException', (err) => { console.error('Uncaught global exception:', err.message, err.stack); });
console.log("LOG POINT 15: Event listeners for SIGINT and uncaughtException set up. Script fully parsed.");
console.log("<<<<< SCRIPT VERSION 15.4 HAS FINISHED PARSING - BOTTOM OF FILE >>>>>");
