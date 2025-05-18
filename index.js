// Unite Students Contract Checker Bot - vNext Attempt 15.8
// Ultra-Minimal goto test: No interception, common UA, check HTTP response, then immediate body check.
// SCRIPT VERSION 15.8 log is present.
// DUMP_HTML_AFTER_ENSUITE_CLICK is true (though may not be reached if initial load fails).

console.log("<<<<< SCRIPT VERSION 15.8 IS RUNNING - TOP OF FILE >>>>>"); 

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

const INITIAL_GOTO_TIMEOUT = 60000; // 60 seconds for the initial goto attempt
const NAVIGATION_TIMEOUT = 120000; 
const PAGE_TIMEOUT = 150000;    
console.log("LOG POINT 4: After TIMEOUT consts. INITIAL_GOTO_TIMEOUT set to:", INITIAL_GOTO_TIMEOUT);

const DUMP_HTML_AFTER_ENSUITE_CLICK = process.env.DEBUG_HTML_DUMP === 'true' || true; 
console.log("LOG POINT 5: After DUMP_HTML const. DUMP_HTML_AFTER_ENSUITE_CLICK is:", DUMP_HTML_AFTER_ENSUITE_CLICK);

async function sendDiscordMessage(content) { /* ... (same as v15.7 - using fetch) ... */ }
console.log("LOG POINT 6: After sendDiscordMessage function definition (using fetch).");

async function waitForSelectorWithTimeout(page, selector, timeout = 10000) { /* ... (unchanged) ... */ }
console.log("LOG POINT 7: After waitForSelectorWithTimeout function definition");

async function enhancedClick(page, selectors, textContent, description = "element") { /* ... (unchanged from v15.7) ... */ }
console.log("LOG POINT 8: After enhancedClick function definition");

async function checkForContracts() {
  console.log("<<<<< CHECKFORCONTRACTS FUNCTION ENTERED (v15.8) >>>>>");
  console.log(`[${new Date().toISOString()}] Running contract check...`);
  let browser = null;
  let page = null;
  
  try {
    // ... (Google fetch test - can be kept or commented out for brevity if consistently passing) ...

    console.log('Launching browser (Ultra-Minimal Test)...');
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
    // ---- SET A VERY GENERIC USER AGENT ----
    const commonUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.2478.80'; // MS Edge
    await page.setUserAgent(commonUserAgent);
    console.log(`Set User-Agent to: ${commonUserAgent}`);
    
    page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT); 
    page.setDefaultTimeout(PAGE_TIMEOUT); 
    
    // ---- NO REQUEST INTERCEPTION FOR THIS INITIAL GOTO TEST ----
    // await page.setRequestInterception(true); 
    // page.on('request', (request) => { /* ... */ });
    console.log("<<<<< CHECKFORCONTRACTS: Request Interception IS DISABLED for initial goto. >>>>>");
    console.log("<<<<< CHECKFORCONTRACTS: Page setup complete. >>>>>");

    console.log(`Navigating to property page (Ultra-Minimal: NO waitUntil, NO interception, ${INITIAL_GOTO_TIMEOUT}ms timeout)...`);
    let httpResponse = null;
    let contentAfterGoto = "Initial goto did not resolve or content not fetched.";
    let urlAfterGoto = PROPERTY_URL; // Default to original URL
    let titleAfterGoto = "Unknown";

    try {
        httpResponse = await page.goto(PROPERTY_URL, { timeout: INITIAL_GOTO_TIMEOUT }); // NO waitUntil
        
        urlAfterGoto = await page.url(); // Get URL immediately
        titleAfterGoto = await page.title(); // Get title immediately

        if (httpResponse) {
            console.log(`page.goto() responded. Status: ${httpResponse.status()} ${httpResponse.statusText()}`);
            await sendDiscordMessage({
                title: "DEBUG - Ultra-Minimal Goto Response",
                description: `URL: ${urlAfterGoto}\nStatus: ${httpResponse.status()} ${httpResponse.statusText()}\nHeaders (partial): \`\`\`json\n${JSON.stringify(httpResponse.headers(), null, 2).substring(0,1500)}\n\`\`\``,
                color: 0x1ABC9C // Teal
            });

            if (httpResponse.ok()) {
                console.log('Attempting to get page.content() snapshot...');
                contentAfterGoto = await page.content();
                console.log('Page content snapshot obtained (first 3KB for console):', contentAfterGoto.substring(0, 3000));
                await sendDiscordMessage({
                    title: "DEBUG - Ultra-Minimal Goto HTML Snapshot",
                    description: `URL: ${urlAfterGoto}\nTitle: ${titleAfterGoto}\n\nHTML (start):\n\`\`\`html\n${contentAfterGoto.substring(0,1800)}\n\`\`\``,
                    color: 0x2ECC71 
                });
                // if (contentAfterGoto.length > 1800) { /* ... send continuation ... */ }

                const bodyExists = await page.evaluate(() => document.body !== null && typeof document.body !== 'undefined');
                console.log("Check: Does document.body exist (even if not 'visible' by waitForSelector)? Result:", bodyExists);
                await sendDiscordMessage({ title: "DEBUG - Body DOM Existence Check", description: `document.body exists: ${bodyExists}`, color: bodyExists ? 0x2ECC71 : 0xFF8C00 });

                if (!bodyExists) {
                    throw new Error("document.body was null or undefined after goto and content retrieval.");
                }
                // If body exists, let's try waiting for it to be "visible" with a short timeout
                // This is more of a sanity check now
                console.log("Body DOM element exists. Now waiting for it with waitForSelector (short)...");
                if(!await waitForSelectorWithTimeout(page, 'body', 10000)){ // Shorter wait
                    console.warn("Body exists in DOM, but waitForSelector('body', {visible:true}) timed out. Page might be styled strangely or very slow to become interactive.");
                    // Don't throw an error, proceed with caution.
                } else {
                    console.log("Body tag also confirmed by waitForSelector.");
                }

            } else {
                console.error(`HTTP Response not OK: ${httpResponse.status()}`);
                const responseText = await httpResponse.text();
                console.error("Response text (start):", responseText.substring(0,1000));
                await sendDiscordMessage({ title: "ERROR - HTTP Not OK", description: `Status: ${httpResponse.status()}\nResponse Text (start): ${responseText.substring(0,1800)}`, color: 0xFF0000 });
                throw new Error(`HTTP response not OK: ${httpResponse.status()}`);
            }
        } else {
            console.error("page.goto() returned a null/undefined response. This is highly unexpected.");
            throw new Error("page.goto() returned null response.");
        }

    } catch (gotoError) {
        console.error(`<<<<< CHECKFORCONTRACTS: ERROR IN ULTRA-MINIMAL GOTO OR RESPONSE CHECK >>>>>`);
        console.error(`Error: ${gotoError.message}`, gotoError.stack);
        await sendDiscordMessage({
            title: "❌ ERROR - Ultra-Minimal Goto/Response Failed",
            description: `page.goto or response processing failed: ${gotoError.message}\nURL attempted: ${PROPERTY_URL}\nInitial Content Attempt (start): ${contentAfterGoto.substring(0,500)}`,
            color: 0xFF0000
        });
        throw gotoError; 
    }
    console.log("<<<<< CHECKFORCONTRACTS: Initial page.goto() and basic checks passed (NO INTERCEPTION). >>>>>");
    
    // ---- RE-ENABLE REQUEST INTERCEPTION for subsequent actions ----
    console.log("Re-enabling request interception for further navigation...");
    await page.setRequestInterception(true); // Turn it back on
    page.on('request', (request) => { 
        const resourceType = request.resourceType();
        const url = request.url().toLowerCase();
        if (['image', 'media'].includes(resourceType) ) { request.abort(); } 
        else if (resourceType === 'font' && !url.includes('essential')) { request.abort(); } 
        else if (url.includes('analytics') || url.includes('tracking') || url.includes('hotjar') || url.includes('googletagmanager')) { request.abort(); } 
        else { request.continue(); }
    });
    // ----------------------------------------------------------

    try { /* ... (cookie consent - same as v15.5) ... */ } catch (e) { console.log('Minor error during cookie consent:', e.message); }
    
    console.log('Waiting for main page interactive elements to settle (e.g. "Rooms available" text)...');
    try { /* ... (wait for "Rooms available" - same as v15.5) ... */ } catch (e) { /* ... */ }
    await page.waitForTimeout(2000); 
    
    console.log('Current page URL before Find a Room attempt:', await page.url());
    const findRoomSelectors = [ /* ... (same as v15.5) ... */ ];
    const findRoomSuccess = await enhancedClick(page, findRoomSelectors, 'Find a room', 'Find a room button');
    if (!findRoomSuccess) { /* ... (error from v15.5) ... */ throw new Error('Could not click "Find a room" button.'); }
    
    // ... (Rest of the script: ensuite click, DUMP_HTML_AFTER_ENSUITE_CLICK logic, contract extraction) ...
    // This part remains the same as v15.5
    
  } catch (error) { /* ... (main catch block - same as v15.5) ... */ } 
  finally { /* ... (finally block - same as v15.5) ... */ }
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
console.log("<<<<< SCRIPT VERSION 15.8 HAS FINISHED PARSING - BOTTOM OF FILE >>>>>");
