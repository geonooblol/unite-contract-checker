// Unite Students Contract Checker Bot - vNext Attempt 15.12
// Re-introducing Puppeteer.
// Initial goto: NO waitUntil, NO interception.
// Added long dumb pause and document.readyState check after goto.
// SCRIPT VERSION 15.12 log is present.
// DUMP_HTML_AFTER_ENSUITE_CLICK is true.

console.log("<<<<< SCRIPT VERSION 15.12 IS RUNNING - TOP OF FILE >>>>>"); 

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

const INITIAL_GOTO_TIMEOUT = 90000; // Increased initial goto timeout to 90s for this attempt
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
  console.log("<<<<< CHECKFORCONTRACTS FUNCTION ENTERED (v15.12) >>>>>");
  console.log(`[${new Date().toISOString()}] Running contract check...`);
  let browser = null;
  let page = null;
  
  try {
    // Direct fetch test can be commented out if it was consistently successful
    // console.log(`Attempting direct fetch of PROPERTY_URL: ${PROPERTY_URL} with node-fetch...`);
    // try { /* ... direct fetch ... */ } catch (directFetchError) { /* ... */ }
    // console.log("<<<<< CHECKFORCONTRACTS: Direct node-fetch test completed. >>>>>");

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
    const commonUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.2478.80';
    await page.setUserAgent(commonUserAgent);
    console.log(`Set Puppeteer User-Agent to: ${commonUserAgent}`);
    
    page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT); 
    page.setDefaultTimeout(PAGE_TIMEOUT); 
    
    console.log("<<<<< CHECKFORCONTRACTS: Request Interception IS DISABLED for Puppeteer initial goto. >>>>>");
    console.log("<<<<< CHECKFORCONTRACTS: Page setup complete (before goto). >>>>>");

    console.log(`Navigating to property page with Puppeteer (NO waitUntil, NO interception, ${INITIAL_GOTO_TIMEOUT}ms timeout)...`);
    let httpResponse = null;
    let contentAfterGoto = "Puppeteer goto did not resolve or content not fetched.";
    let urlAfterGoto = PROPERTY_URL; 
    let titleAfterGoto = "Unknown";

    try {
        httpResponse = await page.goto(PROPERTY_URL, { timeout: INITIAL_GOTO_TIMEOUT }); 
        
        urlAfterGoto = await page.url(); 
        titleAfterGoto = await page.title(); 

        if (httpResponse) {
            console.log(`Puppeteer page.goto() responded. Status: ${httpResponse.status()} ${httpResponse.statusText()}`);
            await sendDiscordMessage({ /* ... DEBUG - Puppeteer Minimal Goto Response ... */ }); // Keep this

            if (httpResponse.ok()) {
                console.log("page.goto() OK. Adding a 30-SECOND fixed delay for page to execute JS and settle...");
                await page.waitForTimeout(30000); // LONG DUMB PAUSE
                console.log("30-second fixed delay complete.");

                console.log('Attempting to get Puppeteer page.content() snapshot after long pause...');
                contentAfterGoto = await page.content();
                console.log('Puppeteer Page content snapshot (first 3KB for console):', contentAfterGoto.substring(0, 3000));
                await sendDiscordMessage({ /* ... DEBUG - Puppeteer Minimal Goto HTML Snapshot ... */ });

                const readyState = await page.evaluate(() => document.readyState);
                console.log(`Check: document.readyState after long pause: "${readyState}"`);
                await sendDiscordMessage({ title: "DEBUG - document.readyState Check", description: `document.readyState: ${readyState}`, color: readyState === 'complete' ? 0x2ECC71 : 0xFF8C00 });

                const bodyExists = await page.evaluate(() => document.body !== null && typeof document.body !== 'undefined' && document.body.innerHTML.trim() !== '');
                console.log("Check: Does document.body exist AND have content? Result:", bodyExists);
                await sendDiscordMessage({ title: "DEBUG - Body DOM Existence & Content Check", description: `document.body exists & has content: ${bodyExists}`, color: bodyExists ? 0x2ECC71 : 0xFF8C00 });

                if (!bodyExists) {
                    throw new Error("Puppeteer: document.body was null, undefined, or empty after long pause.");
                }
                
                console.log("Puppeteer: Body DOM element exists and has content. Now waiting for it with waitForSelector...");
                if(!await waitForSelectorWithTimeout(page, 'body', 15000)){ // 15s should be enough if body is truly there
                    console.warn("Puppeteer: Body exists in DOM and has content, but waitForSelector('body', {visible:true}) timed out.");
                } else {
                    console.log("Puppeteer: Body tag also confirmed by waitForSelector.");
                }

            } else { /* ... HTTP Not OK error handling ... */ throw new Error(`HTTP response not OK: ${httpResponse.status()}`); }
        } else { /* ... null response error handling ... */ throw new Error("page.goto() returned null response."); }

    } catch (puppeteerGotoError) {
        console.error(`<<<<< CHECKFORCONTRACTS: ERROR IN PUPPETEER GOTO OR RESPONSE/DOM CHECK >>>>>`);
        console.error(`Error: ${puppeteerGotoError.message}`, puppeteerGotoError.stack);
        await sendDiscordMessage({
            title: "❌ ERROR - Puppeteer Goto/DOM Check Failed",
            description: `Puppeteer page.goto or DOM check failed: ${puppeteerGotoError.message}\nURL: ${urlAfterGoto}, Title: ${titleAfterGoto}\nContent Attempt (start): ${contentAfterGoto.substring(0,500)}`,
            color: 0xFF0000
        });
        throw puppeteerGotoError; 
    }
    console.log("<<<<< CHECKFORCONTRACTS: Puppeteer initial page.goto() and basic DOM checks passed. >>>>>");
    
    console.log("Re-enabling request interception for further navigation...");
    await page.setRequestInterception(true); 
    page.on('request', (request) => { /* ... (tuned interception from v15.10) ... */ });

    try { /* ... (cookie consent) ... */ } catch (e) { /* ... */ }
    console.log('Waiting for main page interactive elements ("Rooms available" text)...');
    try { /* ... (wait for "Rooms available") ... */ } catch (e) { /* ... */ }
    await page.waitForTimeout(2000); 
    
    console.log('Current page URL before Find a Room attempt:', await page.url());
    const findRoomSelectors = [ /* ... (same) ... */ ];
    const findRoomSuccess = await enhancedClick(page, findRoomSelectors, 'Find a room', 'Find a room button');
    if (!findRoomSuccess) { /* ... (error) ... */ throw new Error('Could not click "Find a room" button.'); }
    
    // ... (Rest of the script: ensuite click, DUMP_HTML_AFTER_ENSUITE_CLICK logic, contract extraction) ...
    
  } catch (error) { /* ... (main catch block - same) ... */ } 
  finally { /* ... (finally block - same) ... */ }
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
console.log("<<<<< SCRIPT VERSION 15.12 HAS FINISHED PARSING - BOTTOM OF FILE >>>>>");
