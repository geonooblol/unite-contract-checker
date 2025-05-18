// Unite Students Contract Checker Bot - vNext Attempt 15.5
// Staged waiting after minimal goto: wait for body, then primary content indicator.
// Request interception re-enabled (less aggressive initially).
// SCRIPT VERSION 15.5 log is present.
// DUMP_HTML_AFTER_ENSUITE_CLICK is true (though may not be reached).

console.log("<<<<< SCRIPT VERSION 15.5 IS RUNNING - TOP OF FILE >>>>>"); 

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

async function sendDiscordMessage(content) { /* ... (same as v15.4) ... */ }
console.log("LOG POINT 6: After sendDiscordMessage function definition (using fetch).");

async function waitForSelectorWithTimeout(page, selector, timeout = 10000) { /* ... (unchanged) ... */ }
console.log("LOG POINT 7: After waitForSelectorWithTimeout function definition");

async function enhancedClick(page, selectors, textContent, description = "element") { /* ... (unchanged from v15.4) ... */ }
console.log("LOG POINT 8: After enhancedClick function definition");

async function checkForContracts() {
  console.log(`[${new Date().toISOString()}] Running contract check...`);
  let browser = null;
  let page = null;
  
  try {
    // ... (Google fetch test - unchanged from v15.4, can be commented out if consistently passing)
    console.log("Attempting to fetch google.com as a basic network test...");
    try { /* ... Google fetch ... */ } catch (fetchError) { /* ... */ }


    console.log('Launching browser...');
    browser = await puppeteer.launch({ /* ... (launch options same as v15.4) ... */ });
    
    page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT); 
    page.setDefaultTimeout(PAGE_TIMEOUT); 
    
    // ---- Re-enable Request Interception (slightly less aggressive initially) ----
    await page.setRequestInterception(true);
    page.on('request', (request) => { 
        const resourceType = request.resourceType();
        const url = request.url().toLowerCase();
        // Allow CSS, scripts, xhr, fetch for initial render, block heavy media/fonts unless essential
        if (['image', 'media'].includes(resourceType) ) { 
            request.abort();
        } else if (resourceType === 'font' && !url.includes('essential')) { // Example: allow essential fonts
             request.abort();
        } else if (url.includes('analytics') || url.includes('tracking') || url.includes('hotjar') || url.includes('googletagmanager')) {
            request.abort();
        } else {
            request.continue();
        }
    });
    console.log("Request interception RE-ENABLED (tuned for initial load).");
    // ---- END Re-enable Request Interception ----


    console.log(`Navigating to property page (NO waitUntil, interception ON, ${INITIAL_GOTO_TIMEOUT}ms timeout)...`);
    let initialContentSnapshot = "No content snapshot taken yet.";
    let initialUrl = "unknown";
    let initialTitle = "unknown";

    try {
        await page.goto(PROPERTY_URL, { timeout: INITIAL_GOTO_TIMEOUT }); // NO waitUntil
        initialUrl = await page.url();
        initialTitle = await page.title();
        console.log(`page.goto() resolved. Current URL: ${initialUrl}, Title: ${initialTitle}`);

        console.log('Attempting to get page content snapshot immediately after minimal goto...');
        initialContentSnapshot = await page.content();
        // console.log('Page content snapshot (first 2KB for console):', initialContentSnapshot.substring(0, 2000)); // Keep for deep debug
        
        await sendDiscordMessage({
            title: "DEBUG - Minimal Goto Snapshot",
            description: `URL: ${initialUrl}\nTitle: ${initialTitle}\n\nHTML (start):\n\`\`\`html\n${initialContentSnapshot.substring(0,1800)}\n\`\`\``,
            color: 0x2ECC71 
        });
        // if (initialContentSnapshot.length > 1800) { /* ... send continuation ... */ }

        console.log("Waiting for body tag to be present (extended timeout)...");
        if (!await waitForSelectorWithTimeout(page, 'body', 30000)) { // Increased to 30s for body
            console.error("Page body tag did not become available. Content received was:", initialContentSnapshot.substring(0,500));
            throw new Error("Page body tag did not become available after minimal goto.");
        }
        console.log("Body tag found.");

        console.log("Waiting for a primary page structure indicator (e.g., #__next main, footer, etc.)...");
        const primaryContentSelectors = [
            '#__next main',                // Common Next.js main content
            '#__next div[role="main"]',
            'footer',                      // A page footer often indicates main structure is there
            'header ~ main',               // Main tag that is a sibling after a header
            'div[id*="page-container"]',   // Common container IDs
            'div[class*="main-wrapper"]'
        ];
        let primaryStructureFound = false;
        for (const selector of primaryContentSelectors) {
            if (await waitForSelectorWithTimeout(page, selector, 15000)) { // 15s for each attempt
                console.log(`Primary page structure indicator "${selector}" found.`);
                primaryStructureFound = true;
                break;
            }
        }
        
        if (!primaryStructureFound) {
             const bodyHTML = await page.evaluate(() => document.body ? document.body.innerHTML.substring(0,2000) : "No body HTML");
             console.warn("Primary page structure indicator not found after body. Body HTML (start):", bodyHTML);
             await sendDiscordMessage({
                 title: "WARNING - Primary Page Structure Not Found",
                 description: `Could not find primary structure (e.g. #__next main, footer) after body. URL: ${await page.url()}\nBody HTML (start):\n\`\`\`html\n${bodyHTML.substring(0,1800)}\n\`\`\``,
                 color: 0xFF8C00
             });
             // Don't throw an error yet, let subsequent steps try.
        } else {
            console.log("Primary page structure confirmed.");
        }
        await page.waitForTimeout(5000); // Give more time for JS to execute after main structure appears

    } catch (gotoError) {
        console.error(`Error during page.goto() or initial content/structure check: ${gotoError.message}`, gotoError.stack);
        await sendDiscordMessage({
            title: "❌ ERROR - Goto or Initial Structure Failed",
            description: `page.goto (no waitUntil) or structure check failed: ${gotoError.message}\nURL attempted: ${PROPERTY_URL}\nSnapshot attempt: ${initialContentSnapshot.substring(0,500)}`,
            color: 0xFF0000
        });
        throw gotoError; 
    }
    
    try { /* ... (cookie consent - same as v15.4) ... */ } catch (e) { console.log('Minor error during cookie consent:', e.message); }
    
    console.log('Waiting for main page interactive elements to settle (e.g. "Rooms available" text)...');
    try {
       await page.waitForSelector('::-p-text(Rooms available)', { timeout: 30000 }); // Increased timeout
       console.log("'Rooms available' text found, page likely settled for interaction.");
    } catch (e) {
       console.warn("Did not find 'Rooms available' text after primary structure checks. Proceeding with 'Find a room' click with caution.");
       // ... (Optional: send Discord warning + HTML dump) ...
    }
    await page.waitForTimeout(2000); 
    
    console.log('Current page URL before Find a Room attempt:', await page.url());
    const findRoomSelectors = [ /* ... (same as v15.4) ... */ ];
    const findRoomSuccess = await enhancedClick(page, findRoomSelectors, 'Find a room', 'Find a room button');
    if (!findRoomSuccess) { /* ... (error handling and HTML dump from v15.4) ... */ throw new Error('Could not click "Find a room" button.'); }
    
    // ... (Rest of the script: ensuite click, HTML dump, contract extraction - same as v15.4) ...
    
  } catch (error) { /* ... (main catch block - same as v15.4) ... */ } 
  finally { /* ... (browser.close() - same as v15.4) ... */ }
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
console.log("<<<<< SCRIPT VERSION 15.5 HAS FINISHED PARSING - BOTTOM OF FILE >>>>>");
