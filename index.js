// Unite Students Contract Checker Bot - vNext Attempt 9
// Added try...catch inside page.evaluate for contract extraction to capture errors.
// node-fetch is still commented out for this run.

// --- ENV VAR CHECK AT THE VERY TOP ---
console.log("--- INIT: ENV VAR CHECK (RAW) ---"); // ... (these will still run)
console.log("Raw process.env.DISCORD_WEBHOOK_URL:", process.env.DISCORD_WEBHOOK_URL);
console.log("Typeof raw process.env.DISCORD_WEBHOOK_URL:", typeof process.env.DISCORD_WEBHOOK_URL);
console.log("--- END INIT: ENV VAR CHECK (RAW) ---");

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const cron = require('node-cron');
// const fetch = require('node-fetch'); // <<<< TEST: STILL COMMENTED OUT
console.log("LOG POINT 0: node-fetch require line has been processed/commented.");


const dotenv = require('dotenv');
dotenv.config(); 
console.log("LOG POINT 0.5: dotenv.config() processed.");


const DISCORD_WEBHOOK_URL_FROM_ENV = process.env.DISCORD_WEBHOOK_URL; 
console.log("DISCORD_WEBHOOK_URL_FROM_ENV (would be used by fetch):", DISCORD_WEBHOOK_URL_FROM_ENV);
console.log("LOG POINT 1: Before CHECK_INTERVAL declaration");


const CHECK_INTERVAL = process.env.CHECK_INTERVAL || '0 */4 * * *';
console.log("LOG POINT 2: After CHECK_INTERVAL, before PROPERTY_URL");
const PROPERTY_URL = 'https://www.unitestudents.com/student-accommodation/medway/pier-quays';
console.log("LOG POINT 3: After PROPERTY_URL");

const NAVIGATION_TIMEOUT = 75000; 
const PAGE_TIMEOUT = 100000;    
console.log("LOG POINT 4: After TIMEOUT consts");

const DUMP_CONTRACT_SECTION_HTML_FOR_DEBUG = process.env.DEBUG_HTML_DUMP === 'true' || true; 
console.log("LOG POINT 5: After DUMP_HTML const");


async function sendDiscordMessage(content) {
  // <<<< TEST: BODY OF FUNCTION COMMENTED OUT / GUARDED
  console.warn("TEST: sendDiscordMessage called, but node-fetch is commented out. No message will be sent.");
  console.log("Content title that would have been sent:", content.title);
  if (content.description) console.log("Content description (start):", String(content.description).substring(0,100));
  return; 
}
console.log("LOG POINT 6: After sendDiscordMessage function definition");


async function waitForSelectorWithTimeout(page, selector, timeout = 10000) {
  try {
    await page.waitForSelector(selector, { visible: true, timeout });
    return true;
  } catch (error) {
    return false;
  }
}
console.log("LOG POINT 7: After waitForSelectorWithTimeout function definition");

async function enhancedClick(page, selectors, textContent, description = "element") {
  // ... (function body unchanged)
  for (const selector of Array.isArray(selectors) ? selectors : [selectors]) {
    try {
      console.log(`Attempting to click ${description} using selector: ${selector}`);
      if (await waitForSelectorWithTimeout(page, selector, 10000)) { 
        await page.click(selector);
        console.log(`Successfully clicked ${description} using: ${selector}`);
        await page.waitForTimeout(4000); 
        return true;
      } else {
        console.log(`Selector ${selector} for ${description} not visible/found in time.`);
      }
    } catch (e) {
      console.log(`Failed to click ${description} using selector: ${selector}. Error: ${e.message}`);
    }
  }
  if (textContent) { /* ... (textContent click logic) ... */ }
  console.log(`Could not click ${description} using any provided method.`);
  return false;
}
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
      args: [ /* ... browser args ... */ ],
      protocolTimeout: 180000 
    });
    
    page = await browser.newPage();
    /* ... viewport, useragent, timeouts, request interception ... */
    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT);
    page.setDefaultTimeout(PAGE_TIMEOUT);
    await page.setRequestInterception(true);
    page.on('request', (request) => { 
        const resourceType = request.resourceType();
        const url = request.url().toLowerCase();
        if (['font', 'image', 'media', 'stylesheet'].includes(resourceType) && !url.includes('essential')) { request.abort(); }
        else if (url.includes('analytics') || url.includes('tracking') || url.includes('hotjar') || url.includes('googletagmanager')) { request.abort(); }
        else { request.continue(); }
    });

    console.log('Navigating to property page...');
    await page.goto(PROPERTY_URL, { waitUntil: 'domcontentloaded' });
    console.log('Page loaded');
    
    try { /* ... cookie consent ... */ } catch (e) { console.log('Minor error during cookie consent:', e.message); }
    
    console.log('Current page URL:', page.url());
    
    const findRoomSuccess = await enhancedClick(page, ['button[data-event="book_a_room"]'], 'Find a room', 'Find a room button');
    if (!findRoomSuccess) throw new Error('Could not click "Find a room" button.');
    
    console.log('Waiting for page to transition after "Find a room" click...');
    await page.waitForTimeout(7000); 
    
    const urlAfterFindRoom = await page.url();
    const titleAfterFindRoom = await page.title();
    console.log('Current URL after Find Room and initial wait:', urlAfterFindRoom);
    console.log('Page title after Find Room and initial wait:', titleAfterFindRoom);

    console.log('Attempting to locate general room type selection interface (e.g., any button with data-room_type)...');
    if (!await waitForSelectorWithTimeout(page, 'button[data-room_type]', 35000)) { 
        console.error("No room type buttons (e.g., [data-room_type]) found/visible in time even after extended wait.");
        // ... (debug info gathering and throw error - this part will call the neutered sendDiscordMessage) ...
        throw new Error("No room type buttons (e.g., [data-room_type]) found/visible. Check console for page state dump details.");
    }
    console.log('General room type buttons interface appears to be ready.');

    const ensuiteSuccess = await enhancedClick(page, 
        ['button[data-room_type="ENSUITE"]', 'button[aria-label="Select ENSUITE"]', 'button[aria-label*="En-suite" i]', 'div[role="button"][aria-label*="En-suite" i]'], 
        'En-suite', 'Ensuite option'
    );
    if (!ensuiteSuccess) throw new Error('Could not click "Ensuite" option using enhancedClick.');
    
    console.log('Waiting for contract options to appear/load...');
    if (!await waitForSelectorWithTimeout(page, 'span ::-p-text(Reserve your room)', 30000)) { /* ... */ }
    await page.waitForTimeout(3000); 

    console.log(`On page for contract extraction: ${await page.title()} | URL: ${await page.url()}`);

    if (DUMP_CONTRACT_SECTION_HTML_FOR_DEBUG) { /* ... (HTML dump logic - will call neutered sendDiscordMessage) ... */ }
    
    console.log('Extracting contract information...');
    // ---- MODIFIED page.evaluate WITH INTERNAL TRY...CATCH ----
    const contractsData = await page.evaluate(() => {
        try {
            const results = []; 
            function findContractTerms(contextNode) {
                let reserveSection = null;
                const reserveRoomSpan = Array.from(contextNode.querySelectorAll('span')).find(
                    s => s.textContent.trim().toLowerCase() === "reserve your room"
                );

                if (reserveRoomSpan && reserveRoomSpan.parentElement) {
                    reserveSection = reserveRoomSpan.parentElement;
                } else {
                    // This console.error will only show in browser context, not Node.
                    // The error object returned by page.evaluate will be more useful.
                    console.error("page.evaluate: Could not find 'Reserve your room' span or its parent.");
                    reserveSection = contextNode.querySelector('div.mt-9'); 
                    if(reserveSection && !reserveSection.textContent.toLowerCase().includes("reserve your room")) {
                        reserveSection = null; 
                    } else if (reserveSection) {
                         console.warn("page.evaluate: Found reserveSection using fallback 'div.mt-9'.");
                    }
                }

                if (!reserveSection) {
                     console.error("page.evaluate: `reserveSection` could not be definitively identified.");
                     return false; // for findContractTerms
                }

                const optionsContainer = reserveSection.querySelector('div[role="radiogroup"]');
                let actualContainerToQuery = optionsContainer;

                if (!optionsContainer) {
                    console.warn("page.evaluate: Could not find 'optionsContainer' (div[role=\"radiogroup\"]). Checking if reserveSection itself contains options.");
                    const directOptions = reserveSection.querySelectorAll('div[id="pricing-option"][role="radio"]');
                    if (directOptions.length > 0) {
                        console.warn("page.evaluate: Using `reserveSection` as `optionsContainer`.");
                        actualContainerToQuery = reserveSection;
                    } else {
                         console.error("page.evaluate: No clear optionsContainer or direct options in reserveSection.");
                         return false; 
                    }
                }
                
                if (!actualContainerToQuery) { // Should not happen if above logic is correct, but good guard
                    console.error("page.evaluate: actualContainerToQuery is null/undefined before querying pricingOptions.");
                    return false;
                }

                const pricingOptions = actualContainerToQuery.querySelectorAll('div[id="pricing-option"][role="radio"]');
                if (pricingOptions && pricingOptions.length > 0) {
                    pricingOptions.forEach(option => {
                      const text = option.textContent || '';
                      const weekMatch = text.match(/(\d{1,2})\s*weeks?/i);
                      const term = weekMatch ? weekMatch[0] : 'Unknown term';
                      const dateMatch = text.match(/\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\s*-\s*\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}/);
                      const dates = dateMatch ? dateMatch[0] : 'Unknown dates';
                      let type = 'Unknown type';
                      if (text.toLowerCase().includes('full year')) type = 'Full Year';
                      else if (text.toLowerCase().includes('academic year')) type = 'Academic Year';
                      else if (text.toLowerCase().includes('semester')) type = 'Semester';
                      else if (weekMatch && parseInt(weekMatch[1]) < 40 && parseInt(weekMatch[1]) > 5 ) type = 'Partial Year / Semester';
                      const priceMatch = text.match(/£(\d+(\.\d{2})?)/);
                      const price = priceMatch ? `£${priceMatch[1]}` : 'Unknown price';
                      if (term !== 'Unknown term') {
                        results.push({ term, dates, type, price, rawText: text.substring(0,150).replace(/\s+/g, ' ') });
                      }
                    });
                    return true; 
                } else {
                    console.error("page.evaluate: No 'pricingOptions' found using 'div[id=\"pricing-option\"][role=\"radio\"]'. Snippet of container:", actualContainerToQuery.innerHTML.substring(0,500));
                }
                return false;
            } // End of findContractTerms
            
            if (!findContractTerms(document)) { 
                console.warn("page.evaluate: Primary contract term extraction (findContractTerms) did not yield results or failed to find sections.");
            }
            
            if (results.length === 0) { 
                console.warn("page.evaluate: Primary extraction found 0 contracts. Trying broad page scan for 'X weeks'.");
                // ... (broad scan logic - unchanged) ...
            }
            return { success: true, data: results, error: null, browserLogs: [] }; // Added browserLogs for future
        } catch (e) {
            console.error("Error INSIDE page.evaluate for contract extraction:", e.toString(), e.stack); // This console.error is in browser context
            return { success: false, data: [], error: e.toString() + "\nStack: " + (e.stack || 'No stack available') };
        }
    });
    // ---- END MODIFIED page.evaluate ----

    let contracts;
    if (contractsData && contractsData.success) { // Check contractsData itself is not undefined
        contracts = contractsData.data;
        console.log('Extracted contracts successfully from page.evaluate wrapper.');
    } else if (contractsData) { // It's an error object from our try...catch
        console.error("Error reported from page.evaluate during contract extraction:", contractsData.error);
        contracts = []; 
        await sendDiscordMessage({ 
            title: "❌ Error During Contract Scraping (page.evaluate)",
            description: `Error: ${String(contractsData.error).substring(0,4000)}`, // Convert to string
            color: 0xFF0000
        });
    } else {
        // This case means page.evaluate itself might have failed in a way that didn't even return our object
        // e.g. if it was killed due to page crash, or other critical puppeteer error.
        console.error("Critical failure: page.evaluate for contract extraction returned undefined or an unexpected value.");
        contracts = []; // Default to empty
        await sendDiscordMessage({
            title: "❌ Critical Error in page.evaluate",
            description: "The page.evaluate call for contract extraction did not return the expected object structure. This might indicate a page crash or severe Puppeteer issue.",
            color: 0xFF0000
        });
    }
    
    console.log('Final contracts variable:', JSON.stringify(contracts, null, 2));
    
    if (!contracts || contracts.length === 0) { 
        if (!(contractsData && !contractsData.success)) { // Don't send "No Details" if we already sent an error from page.evaluate
            await sendDiscordMessage({ title: '❓ Contract Check - No Details Found', description: `The bot couldn't find any contract information. (page.evaluate success: ${contractsData ? contractsData.success : 'N/A'})`, color: 15105570, url: await page.url() });
        }
    } 
    else { /* ... (Process new contracts / standard only message) ... */ }
    
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

// --- Health check and scheduling ---
// ... (unchanged)

// --- Startup Logic ---
// ... (unchanged, DUMP_HTML is true for this run)
console.log("LOG POINT 13: Before Startup Logic (HTML DUMP MODE IS ON)");
if (DUMP_CONTRACT_SECTION_HTML_FOR_DEBUG) { 
    console.log("HTML DUMP MODE IS ON - running checkForContracts once for debug.");
    (async () => {
        await checkForContracts();
        console.log("HTML DUMP debug run complete.");
    })();
} else { /* ... */ }
console.log("LOG POINT 14: After Startup Logic initiated");


process.on('SIGINT', () => { console.log('Bot shutting down...'); process.exit(0); });
process.on('uncaughtException', (err) => { console.error('Uncaught global exception:', err.message, err.stack); });
console.log("LOG POINT 15: Event listeners for SIGINT and uncaughtException set up. Script fully parsed.");
