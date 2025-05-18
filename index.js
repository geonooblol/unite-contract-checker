// Unite Students Contract Checker Bot - vNext Attempt 15.10
// Test: Less aggressive request interception after initial page load, before "Find a room" click.
// SCRIPT VERSION 15.10 log is present.
// DUMP_HTML_AFTER_ENSUITE_CLICK is true.

console.log("<<<<< SCRIPT VERSION 15.10 IS RUNNING - TOP OF FILE >>>>>"); 

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

const INITIAL_GOTO_TIMEOUT = 60000; 
const NAVIGATION_TIMEOUT = 120000; 
const PAGE_TIMEOUT = 150000;    
console.log("LOG POINT 4: After TIMEOUT consts. INITIAL_GOTO_TIMEOUT set to:", INITIAL_GOTO_TIMEOUT);

const DUMP_HTML_AFTER_ENSUITE_CLICK = process.env.DEBUG_HTML_DUMP === 'true' || true; 
console.log("LOG POINT 5: After DUMP_HTML const. DUMP_HTML_AFTER_ENSUITE_CLICK is:", DUMP_HTML_AFTER_ENSUITE_CLICK);

async function sendDiscordMessage(content) { /* ... (same as v15.9 - using fetch) ... */ }
console.log("LOG POINT 6: After sendDiscordMessage function definition (using fetch).");

async function waitForSelectorWithTimeout(page, selector, timeout = 10000) { /* ... (unchanged) ... */ }
console.log("LOG POINT 7: After waitForSelectorWithTimeout function definition");

async function enhancedClick(page, selectors, textContent, description = "element") { /* ... (unchanged from v15.9) ... */ }
console.log("LOG POINT 8: After enhancedClick function definition");

async function checkForContracts() {
  console.log("<<<<< CHECKFORCONTRACTS FUNCTION ENTERED (v15.10) >>>>>");
  console.log(`[${new Date().toISOString()}] Running contract check...`);
  let browser = null;
  let page = null;
  
  try {
    // ... (Direct node-fetch test for PROPERTY_URL - same as v15.9 - can be kept or commented out) ...
    console.log(`Attempting direct fetch of PROPERTY_URL: ${PROPERTY_URL} with node-fetch...`);
    try { /* ... direct fetch ... */ } catch (directFetchError) { /* ... */ }
    console.log("<<<<< CHECKFORCONTRACTS: Direct node-fetch test completed. >>>>>");


    console.log('Launching browser...');
    browser = await puppeteer.launch({ /* ... (launch options same as v15.9) ... */ });
    console.log("<<<<< CHECKFORCONTRACTS: Browser launched. >>>>>");
    page = await browser.newPage();
    console.log("<<<<< CHECKFORCONTRACTS: New page created. >>>>>");
    
    await page.setViewport({ width: 1366, height: 768 });
    const commonUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.2478.80';
    await page.setUserAgent(commonUserAgent);
    console.log(`Set Puppeteer User-Agent to: ${commonUserAgent}`);
    
    page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT); 
    page.setDefaultTimeout(PAGE_TIMEOUT); 
    
    // Request Interception DISABLED for initial Puppeteer goto
    console.log("<<<<< CHECKFORCONTRACTS: Request Interception IS DISABLED for Puppeteer initial goto. >>>>>");
    console.log("<<<<< CHECKFORCONTRACTS: Page setup complete (before goto). >>>>>");

    console.log(`Navigating to property page with Puppeteer (NO waitUntil, NO interception, ${INITIAL_GOTO_TIMEOUT}ms timeout)...`);
    let httpResponse = null;
    // ... (initialContentSnapshot, initialUrl, initialTitle declarations)

    try {
        httpResponse = await page.goto(PROPERTY_URL, { timeout: INITIAL_GOTO_TIMEOUT }); 
        // ... (Logic for handling httpResponse, getting content, checking body existence - same as v15.9) ...
        // This part successfully found the body tag in the previous run.
        console.log("Puppeteer: Body tag also confirmed by waitForSelector."); // Assuming this passed from previous run

    } catch (puppeteerGotoError) { /* ... (error handling from v15.9) ... */ throw puppeteerGotoError; }
    console.log("<<<<< CHECKFORCONTRACTS: Puppeteer initial page.goto() and basic body checks passed. >>>>>");
    
    // ---- RE-ENABLE REQUEST INTERCEPTION (LESS AGGRESSIVE VERSION) ----
    console.log("Re-enabling request interception (LESS AGGRESSIVE VERSION for Find Room test)...");
    await page.setRequestInterception(true); 
    page.on('request', (request) => { 
        const resourceType = request.resourceType();
        const url = request.url().toLowerCase();

        // ONLY block known tracking/analytics for this specific test phase
        // Allow all scripts, css, fonts, images etc. unless explicitly a tracker
        if (url.includes('analytics') || url.includes('tracking') || url.includes('hotjar') || 
            url.includes('googletagmanager') || url.includes('facebook') || url.includes('bat.bing') ||
            url.includes('googleadservices') || url.includes('doubleclick.net') || url.includes('connect.facebook.net')) {
            // console.log('INTERCEPT: Blocking (tracker):', url.substring(0,100)); // Optional: log blocked trackers
            request.abort(); 
        } else {
            // console.log('INTERCEPT: Allowing:', resourceType, url.substring(0,100)); // Optional: log allowed requests
            request.continue(); 
        }
    });
    console.log("<<<<< CHECKFORCONTRACTS: Less aggressive request interception is now ON. >>>>>");
    // ----------------------------------------------------------

    try { /* ... (cookie consent - same as v15.9) ... */ } catch (e) { console.log('Minor error during cookie consent:', e.message); }
    
    console.log('Waiting for main page interactive elements ("Rooms available" text)...');
    try {
       await page.waitForSelector('::-p-text(Rooms available)', { timeout: 45000 }); // Increased timeout
       console.log("'Rooms available' text found, page likely settled for interaction.");
    } catch (e) {
       console.warn(`Did not find 'Rooms available' text (timeout 45s). Proceeding with 'Find a room' click cautiously. Error: ${e.message}`);
       // ... (Optional: send Discord warning + HTML dump if this fails) ...
    }
    await page.waitForTimeout(3000); // Increased pause after "Rooms available" or timeout
    
    console.log('Current page URL before Find a Room attempt:', await page.url());
    const findRoomSelectors = [
        'button[data-event="book_a_room"][data-property="Pier Quays"]', 
        'button[data-event="book_a_room"]',
        // Adding a more generic selector that might catch it if attributes changed slightly
        'button[class*="primary" i]:contains("Find a room")', // puppeteer-extra might handle :contains, standard puppeteer won't.
                                                            // Text fallback in enhancedClick is more reliable.
        'div[class*="actions"] button:nth-of-type(1)' // If it's the first button in an actions div
    ];
    const findRoomSuccess = await enhancedClick(page, findRoomSelectors, 'Find a room', 'Find a room button');
    if (!findRoomSuccess) { 
       const pageContentAtFailure = await page.content();
       await sendDiscordMessage({
           title: "ERROR - Could Not Click 'Find a room' (v15.10)",
           description: `Failed to click "Find a room". URL: ${await page.url()}\nPage HTML (start):\n\`\`\`html\n${pageContentAtFailure.substring(0,1800)}\n\`\`\``,
           color: 0xFF0000
       });
       throw new Error('Could not click "Find a room" button.');
    }
    
    // ... (Rest of the script: ensuite click, DUMP_HTML_AFTER_ENSUITE_CLICK logic, contract extraction) ...
    // This part remains the same as v15.9
    
  } catch (error) { /* ... (main catch block - same as v15.9) ... */ } 
  finally { /* ... (finally block - same as v15.9) ... */ }
}
console.log("LOG POINT 9: After checkForContracts function definition");

// --- Health check and scheduling --- (unchanged)
// --- Startup Logic --- (unchanged, DUMP_HTML_AFTER_ENSUITE_CLICK controls it)
console.log("LOG POINT 13: Before Startup Logic (DUMP_HTML_AFTER_ENSUITE_CLICK is ON)");
if (DUMP_HTML_AFTER_ENSUITE_CLICK) { /* ... */ } else { /* ... */ }
console.log("LOG POINT 14: After Startup Logic initiated");

process.on('SIGINT', () => { /* ... */ });
process.on('uncaughtException', (err) => { /* ... */ });
console.log("LOG POINT 15: Event listeners for SIGINT and uncaughtException set up. Script fully parsed.");
console.log("<<<<< SCRIPT VERSION 15.10 HAS FINISHED PARSING - BOTTOM OF FILE >>>>>");
