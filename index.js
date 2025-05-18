// Unite Students Contract Checker Bot - vNext Attempt 15.7
// Test: NO request interception for the entire run.
// Test: Added a longer fixed pause after minimal goto, before checking for body.
// SCRIPT VERSION 15.7 log is present.
// DUMP_HTML_AFTER_ENSUITE_CLICK is true.

console.log("<<<<< SCRIPT VERSION 15.7 IS RUNNING - TOP OF FILE >>>>>"); 

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

const INITIAL_GOTO_TIMEOUT = 60000; // Increased initial goto timeout to 60s for this full load test
const NAVIGATION_TIMEOUT = 120000; 
const PAGE_TIMEOUT = 150000;    
console.log("LOG POINT 4: After TIMEOUT consts. INITIAL_GOTO_TIMEOUT set to:", INITIAL_GOTO_TIMEOUT);

const DUMP_HTML_AFTER_ENSUITE_CLICK = process.env.DEBUG_HTML_DUMP === 'true' || true; 
console.log("LOG POINT 5: After DUMP_HTML const. DUMP_HTML_AFTER_ENSUITE_CLICK is:", DUMP_HTML_AFTER_ENSUITE_CLICK);

async function sendDiscordMessage(content) { /* ... (same as v15.5/6) ... */ }
console.log("LOG POINT 6: After sendDiscordMessage function definition (using fetch).");

async function waitForSelectorWithTimeout(page, selector, timeout = 10000) { /* ... (unchanged) ... */ }
console.log("LOG POINT 7: After waitForSelectorWithTimeout function definition");

async function enhancedClick(page, selectors, textContent, description = "element") { /* ... (unchanged from v15.5/6) ... */ }
console.log("LOG POINT 8: After enhancedClick function definition");

async function checkForContracts() {
  console.log("<<<<< CHECKFORCONTRACTS FUNCTION ENTERED (v15.7) >>>>>");
  console.log(`[${new Date().toISOString()}] Running contract check...`);
  let browser = null;
  let page = null;
  
  try {
    // ... (Google fetch test - can be kept or commented out) ...

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
    console.log("<<<<< CHECKFORCONTRACTS: Browser launched. >>>>>");
    page = await browser.newPage();
    console.log("<<<<< CHECKFORCONTRACTS: New page created. >>>>>");
    
    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT); 
    page.setDefaultTimeout(PAGE_TIMEOUT); 
    
    // ---- COMPLETELY DISABLE Request Interception for this ENTIRE test run ----
    // await page.setRequestInterception(true); 
    // page.on('request', (request) => { /* ... */ });
    console.log("<<<<< CHECKFORCONTRACTS: Request Interception IS DISABLED for this entire run. >>>>>");
    // -----------------------------------------------------------------
    console.log("<<<<< CHECKFORCONTRACTS: Page setup complete. >>>>>");

    console.log(`Navigating to property page (NO waitUntil, NO interception, ${INITIAL_GOTO_TIMEOUT}ms timeout)...`);
    let initialContentSnapshot = "Goto did not resolve or content not fetched yet.";
    let initialUrl = "unknown";
    let initialTitle = "unknown";

    try {
        await page.goto(PROPERTY_URL, { timeout: INITIAL_GOTO_TIMEOUT }); // NO waitUntil
        initialUrl = await page.url();
        initialTitle = await page.title();
        console.log(`page.goto() resolved. Current URL: ${initialUrl}, Title: ${initialTitle}`);

        // --- ADD A LONGER, DUMB PAUSE ---
        console.log("Adding a 20-second fixed delay for any initial JS execution (NO interception)...");
        await page.waitForTimeout(20000); // 20 second pause
        console.log("Fixed delay complete.");
        // --- END DUMB PAUSE ---

        initialContentSnapshot = await page.content(); 
        console.log('Page content snapshot obtained after dumb pause (first 2KB for console):', initialContentSnapshot.substring(0, 2000));
        
        await sendDiscordMessage({
            title: "DEBUG - Snapshot After Dumb Pause (No Intercept/WaitUntil)",
            description: `URL: ${await page.url()}\nTitle: ${await page.title()}\n\nHTML (start):\n\`\`\`html\n${initialContentSnapshot.substring(0,1800)}\n\`\`\``,
            color: 0x1ABC9C 
        });
        // if (initialContentSnapshot.length > 1800) { /* ... send continuation ... */ }

        console.log("Waiting for body tag to be present (30s timeout)...");
        if (!await waitForSelectorWithTimeout(page, 'body', 30000)) { 
            console.error("Page body tag still did not become available. Content snapshot was (start):", initialContentSnapshot.substring(0,500));
            throw new Error("Page body tag did not become available even after dumb pause & no interception.");
        }
        console.log("Body tag found.");

        console.log("Waiting for a primary page structure indicator (e.g., #__next main, footer, etc.)...");
        const primaryContentSelectors = [ /* ... (selectors from v15.5) ... */ ];
        // ... (loop and check primaryContentSelectors - same as v15.5) ...
        
        await page.waitForTimeout(5000); 

    } catch (gotoOrBodyError) {
        console.error(`<<<<< CHECKFORCONTRACTS: ERROR IN GOTO OR INITIAL BODY/STRUCTURE CHECK (NO INTERCEPTION) >>>>>`);
        console.error(`Error: ${gotoOrBodyError.message}`, gotoOrBodyError.stack);
        await sendDiscordMessage({
            title: "❌ ERROR - Goto or Initial Structure Failed (No Intercept)",
            description: `page.goto (no waitUntil/intercept) or structure check failed: ${gotoOrBodyError.message}\nURL: ${PROPERTY_URL}\nInitial Content (start): ${initialContentSnapshot.substring(0,500)}`,
            color: 0xFF0000
        });
        throw gotoOrBodyError; 
    }
    console.log("<<<<< CHECKFORCONTRACTS: Initial page load and structure checks passed (NO INTERCEPTION). >>>>>");
    
    // --- Re-enable Request Interception for subsequent actions if needed, or keep disabled ---
    // For this test, we'll keep it disabled to see if clicks work on a "full" page
    // If this test passes, subsequent tests would re-enable a tuned interception.
    console.log("Keeping request interception disabled for click attempts for this specific test.");


    try { /* ... (cookie consent - same) ... */ } catch (e) { console.log('Minor error during cookie consent:', e.message); }
    
    console.log('Waiting for main page interactive elements to settle (e.g. "Rooms available" text)...');
    try { /* ... (wait for "Rooms available" - same) ... */ } catch (e) { /* ... */ }
    await page.waitForTimeout(2000); 
    
    console.log('Current page URL before Find a Room attempt:', await page.url());
    const findRoomSelectors = [ /* ... (same) ... */ ];
    const findRoomSuccess = await enhancedClick(page, findRoomSelectors, 'Find a room', 'Find a room button');
    if (!findRoomSuccess) { /* ... (error) ... */ throw new Error('Could not click "Find a room" button.'); }
    
    // ... (Rest of the script: ensuite click, DUMP_HTML_AFTER_ENSUITE_CLICK logic, contract extraction) ...
    // This part remains the same as v15.5, will use page with NO interception.
    
  } catch (error) {
    console.error('<<<<< CHECKFORCONTRACTS: ERROR CAUGHT IN MAIN TRY-CATCH >>>>>');
    console.error('Error during check:', error.message, error.stack ? error.stack.substring(0,1000) : 'No stack'); 
    let errorDetails = `Error: ${error.message}\nStack: ${error.stack ? error.stack.substring(0,1000) : 'No stack'}`;
    if (page) { /* ... (add URL/Title to errorDetails) ... */ }
    await sendDiscordMessage({ title: '❌ Bot Error', description: `\`\`\`${errorDetails.substring(0, 4000)}\`\`\``, color: 15158332 });
  } finally {
    console.log("<<<<< CHECKFORCONTRACTS: FINALLY BLOCK REACHED >>>>>");
    if (browser) { console.log('Closing browser...'); await browser.close(); }
    console.log("<<<<< CHECKFORCONTRACTS FUNCTION EXITED >>>>>");
  }
}
console.log("LOG POINT 9: After checkForContracts function definition");

// --- Health check and scheduling --- (unchanged)
console.log("LOG POINT 11: After Health Check setup");
console.log("LOG POINT 12: After cron.schedule");

// --- Startup Logic ---
console.log("LOG POINT 13: Before Startup Logic (DUMP_HTML_AFTER_ENSUITE_CLICK is ON)");
if (DUMP_HTML_AFTER_ENSUITE_CLICK) { 
    console.log("HTML DUMP (Post-Ensuite) MODE IS ON - preparing to run checkForContracts once for debug.");
    (async () => {
        console.log("<<<<< SCRIPT VERSION 15.7 - ASYNC IIFE ENTERED >>>>>"); 
        try {
            console.log("<<<<< SCRIPT VERSION 15.7 - CHECKFORCONTRACTS INVOKING NOW... >>>>>");
            await checkForContracts();
            console.log("<<<<< SCRIPT VERSION 15.7 - CHECKFORCONTRACTS CALL COMPLETED >>>>>");
        } catch (iifeError) {
            console.error("<<<<< SCRIPT VERSION 15.7 - ERROR IN STARTUP ASYNC IIFE >>>>>", iifeError.message, iifeError.stack ? iifeError.stack.substring(0,1000) : "No stack in IIFE error");
            await sendDiscordMessage({
                title: "❌ CRITICAL STARTUP ERROR (IIFE)",
                description: `The main async startup function failed: ${iifeError.message}\nStack: ${iifeError.stack ? iifeError.stack.substring(0,1000) : 'No stack'}`,
                color: 0xFF0000
            });
        }
        console.log("HTML DUMP (Post-Ensuite) debug run complete (after IIFE).");
    })();
} else { /* ... */ }
console.log("LOG POINT 14: After Startup Logic initiated");

process.on('SIGINT', () => { /* ... */ });
process.on('uncaughtException', (err) => { /* ... */ });
console.log("LOG POINT 15: Event listeners for SIGINT and uncaughtException set up. Script fully parsed.");
console.log("<<<<< SCRIPT VERSION 15.7 HAS FINISHED PARSING - BOTTOM OF FILE >>>>>");
