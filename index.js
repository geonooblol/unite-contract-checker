// Unite Students Contract Checker Bot - vNext Attempt 15.13
// Added detailed request logging specifically AFTER "Find a room" click.
// SCRIPT VERSION 15.13 log is present.
// DUMP_HTML_AFTER_ENSUITE_CLICK is true.

console.log("<<<<< SCRIPT VERSION 15.13 IS RUNNING - TOP OF FILE >>>>>"); 

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

async function sendDiscordMessage(content) { /* ... (same as v15.9/10/11/12) ... */ }
console.log("LOG POINT 6: After sendDiscordMessage function definition (using fetch).");

async function waitForSelectorWithTimeout(page, selector, timeout = 10000) { /* ... (unchanged) ... */ }
console.log("LOG POINT 7: After waitForSelectorWithTimeout function definition");

async function enhancedClick(page, selectors, textContent, description = "element") { /* ... (unchanged from v15.9/10/11/12) ... */ }
console.log("LOG POINT 8: After enhancedClick function definition");

async function checkForContracts() {
  console.log("<<<<< CHECKFORCONTRACTS FUNCTION ENTERED (v15.13) >>>>>");
  console.log(`[${new Date().toISOString()}] Running contract check...`);
  let browser = null;
  let page = null;
  
  try {
    // Direct fetch test (can be commented out if stable)
    // console.log(`Attempting direct fetch of PROPERTY_URL...`);
    // try { /* ... direct fetch from v15.9 ... */ } catch (directFetchError) { /* ... */ }
    // console.log("<<<<< CHECKFORCONTRACTS: Direct node-fetch test completed. >>>>>");

    console.log('Launching browser...');
    browser = await puppeteer.launch({ /* ... (launch options same as v15.12) ... */ });
    console.log("<<<<< CHECKFORCONTRACTS: Browser launched. >>>>>");
    page = await browser.newPage();
    console.log("<<<<< CHECKFORCONTRACTS: New page created. >>>>>");
    
    await page.setViewport({ width: 1366, height: 768 });
    const commonUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.2478.80';
    await page.setUserAgent(commonUserAgent);
    console.log(`Set Puppeteer User-Agent to: ${commonUserAgent}`);
    
    page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT); 
    page.setDefaultTimeout(PAGE_TIMEOUT); 
    
    // Initial goto with NO interception
    console.log("<<<<< CHECKFORCONTRACTS: Request Interception IS DISABLED for Puppeteer initial goto. >>>>>");
    console.log("<<<<< CHECKFORCONTRACTS: Page setup complete (before goto). >>>>>");

    console.log(`Navigating to property page with Puppeteer (NO waitUntil, NO interception, ${INITIAL_GOTO_TIMEOUT}ms timeout)...`);
    // ... (initial goto and body/DOM checks from v15.12 - this part was working) ...
    // Assume this block completes successfully based on last logs.
    // It ends with: console.log("<<<<< CHECKFORCONTRACTS: Puppeteer initial page.goto() and basic DOM checks passed. >>>>>");


    // ---- MODIFIED: REQUEST INTERCEPTION SETUP WITH DETAILED LOGGING FLAG ----
    let LOG_REQUESTS_POST_FIND_ROOM_CLICK = false; // Flag to control detailed logging
    console.log("Setting up request interception (tuned version) with conditional logging...");
    
    await page.setRequestInterception(true); 
    page.removeAllListeners('request'); // Clear any old listeners just in case

    page.on('request', (request) => { 
        const resourceType = request.resourceType();
        const url = request.url().toLowerCase();
        let action = 'CONTINUE'; // Default action

        // Tuned interception rules (only block known trackers)
        const trackerKeywords = ['analytics', 'tracking', 'hotjar', 'googletagmanager', 'facebook', 'bat.bing', 'googleadservices', 'doubleclick.net', 'connect.facebook.net'];
        let isTracker = false;
        for (const keyword of trackerKeywords) {
            if (url.includes(keyword)) {
                isTracker = true;
                break;
            }
        }

        if (isTracker) {
            action = 'BLOCK (Tracker)';
            request.abort(); 
        } else {
            // For this test, let's be even more permissive initially if not a tracker
            // We can tighten this later if "Find a room" works.
            // if (['image', 'media', 'font'].includes(resourceType) && !url.includes('essential')) {
            //     action = `BLOCK (${resourceType})`;
            //     request.abort();
            // } else {
            //     request.continue();
            // }
            request.continue(); // Allow all non-trackers for now
        }

        if (LOG_REQUESTS_POST_FIND_ROOM_CLICK) { // Log only when flag is true
            console.log(`INTERCEPT (${action}): ${resourceType} - ${url.substring(0,120)}`);
        }
    });
    console.log("<<<<< CHECKFORCONTRACTS: Request interception re-enabled (tuned, conditional logging ready). >>>>>");
    // -----------------------------------------------------------------

    try { /* ... (cookie consent - same as v15.12) ... */ } catch (e) { console.log('Minor error during cookie consent:', e.message); }
    
    console.log('Waiting for main page interactive elements ("Rooms available" text)...');
    try { /* ... (wait for "Rooms available" - same as v15.12, increased timeout) ... */ } catch (e) { /* ... */ }
    await page.waitForTimeout(3000); 
    
    console.log('Current page URL before Find a Room attempt:', await page.url());
    const findRoomSelectors = [ /* ... (same as v15.10/12) ... */ ];
    const findRoomSuccess = await enhancedClick(page, findRoomSelectors, 'Find a room', 'Find a room button');
    
    if (!findRoomSuccess) { 
       // ... (error handling for findRoomSuccess failure - same as v15.12) ...
       throw new Error('Could not click "Find a room" button (v15.13).'); // Specific error
    }
    
    // ---- START DETAILED LOGGING OF REQUESTS ----
    console.log("<<<<< 'Find a room' CLICKED SUCCESSFULLY. Now enabling detailed request logging. >>>>>");
    LOG_REQUESTS_POST_FIND_ROOM_CLICK = true;
    console.log("Waiting 10 seconds for post-'Find a room' requests to fire and be logged...");
    await page.waitForTimeout(10000); // Increased to 10 seconds to capture more requests
    LOG_REQUESTS_POST_FIND_ROOM_CLICK = false; 
    console.log("<<<<< Detailed request logging for post-'Find a room' phase disabled. >>>>>");
    // ---- END DETAILED LOGGING OF REQUESTS ----


    console.log('Attempting to locate general room type selection interface (e.g., any button with data-room_type)...');
    if (!await waitForSelectorWithTimeout(page, 'button[data-room_type]', 35000)) { 
        // ... (debug info gathering and throw error - same as v15.12, will use active sendDiscordMessage) ...
        const dbgUrl = await page.url(); const dbgTitle = await page.title(); const dbgHTML = await page.content();
        await sendDiscordMessage({title: "ERROR - No Room Type Buttons After FindRoom (v15.13)", description: `URL: ${dbgUrl}\nTitle: ${dbgTitle}\nHTML(start):\n\`\`\`html\n${dbgHTML.substring(0,1800)}\n\`\`\``, color:0xFF0000});
        throw new Error("No room type buttons (e.g., [data-room_type]) found/visible after FindRoom click. Check Discord for page state dump details.");
    }
    console.log('General room type buttons interface appears to be ready.');

    const ensuiteSuccess = await enhancedClick(page, 
        ['button[data-room_type="ENSUITE"]', /* ... other selectors ... */], 
        'En-suite', 'Ensuite option'
    );
    if (!ensuiteSuccess) throw new Error('Could not click "Ensuite" option using enhancedClick (v15.13).');
    
    // ... (Rest of the script: DUMP_HTML_AFTER_ENSUITE_CLICK logic, contract extraction) ...
    // This part remains the same as v15.12
    
  } catch (error) { /* ... (main catch block - same as v15.12) ... */ } 
  finally { /* ... (finally block - same as v15.12) ... */ }
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
console.log("<<<<< SCRIPT VERSION 15.13 HAS FINISHED PARSING - BOTTOM OF FILE >>>>>");
