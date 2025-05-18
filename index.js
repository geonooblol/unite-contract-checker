// Unite Students Contract Checker Bot - vNext Attempt 15
// Ensure puppeteer.launch options are correct.
// More robust wait and selectors for "Find a room" button.
// DUMP_HTML_AFTER_ENSUITE_CLICK is true.

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

const NAVIGATION_TIMEOUT = 75000; 
const PAGE_TIMEOUT = 100000;    
console.log("LOG POINT 4: After TIMEOUT consts");

const DUMP_HTML_AFTER_ENSUITE_CLICK = process.env.DEBUG_HTML_DUMP === 'true' || true; 
console.log("LOG POINT 5: After DUMP_HTML const. DUMP_HTML_AFTER_ENSUITE_CLICK is:", DUMP_HTML_AFTER_ENSUITE_CLICK);

async function sendDiscordMessage(content) {
  // ... (sendDiscordMessage using fetch - same as v13/v14) ...
  const webhookUrl = DISCORD_WEBHOOK_URL_FROM_ENV;
  if (!webhookUrl || !webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
    console.warn(`Discord webhook URL appears invalid or is a placeholder. Current URL: "${webhookUrl}". Skipping notification.`);
    return;
  }
  const payload = { /* ... */ }; // Same payload structure
  try { /* ... */ } catch (error) { /* ... */ } // Same try-catch
}
console.log("LOG POINT 6: After sendDiscordMessage function definition (using fetch).");

async function waitForSelectorWithTimeout(page, selector, timeout = 10000) { /* ... (unchanged) ... */ }
console.log("LOG POINT 7: After waitForSelectorWithTimeout function definition");

async function enhancedClick(page, selectors, textContent, description = "element") {
  // ... (enhancedClick from v13/v14, ensure it has good logging) ...
  for (const selector of Array.isArray(selectors) ? selectors : [selectors]) {
    try {
      console.log(`Attempting to click ${description} using selector: ${selector}`);
      // Use a slightly longer timeout within enhancedClick for elements that might appear a bit late
      if (await waitForSelectorWithTimeout(page, selector, 12000)) { 
        await page.click(selector);
        console.log(`Successfully clicked ${description} using: ${selector}`);
        await page.waitForTimeout(4000); 
        return true;
      } else { console.log(`Selector ${selector} for ${description} not visible/found in time for enhancedClick.`); }
    } catch (e) { console.log(`Failed to click ${description} with ${selector} in enhancedClick: ${e.message}`); }
  }
  if (textContent) { 
      try {
        console.log(`Attempting to click ${description} by text content: "${textContent}"`);
        const clicked = await page.evaluate((text) => {
          const elements = Array.from(document.querySelectorAll('button, a, div[role="button"], [class*="button"]'));
          const targetElement = elements.find(el => el.textContent.trim().toLowerCase().includes(text.toLowerCase()));
          if (targetElement) {
            const rect = targetElement.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0 && getComputedStyle(targetElement).visibility !== 'hidden') {
              targetElement.click();
              return true;
            }
          }
          return false;
        }, textContent);
        if (clicked) {
          console.log(`Successfully clicked ${description} by text content`);
          await page.waitForTimeout(4000);
          return true;
        }
      } catch (e) {
        console.log(`Failed to click ${description} by text content in enhancedClick: ${e.message}`);
      }
  }
  console.log(`Could not click ${description} using any provided method in enhancedClick.`);
  return false;
}
console.log("LOG POINT 8: After enhancedClick function definition");

async function checkForContracts() {
  console.log(`[${new Date().toISOString()}] Running contract check...`);
  let browser = null;
  let page = null;
  
  try {
    console.log('Launching browser...');
    // ---- ENSURE CORRECT PUPPETEER LAUNCH OPTIONS ----
    browser = await puppeteer.launch({ 
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--window-size=1366,768' 
      ],
      protocolTimeout: 180000 
    });
    // ---- END CORRECTED OPTIONS ----
    
    page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT);
    page.setDefaultTimeout(PAGE_TIMEOUT);
    
    await page.setRequestInterception(true);
    page.on('request', (request) => { /* ... (request interception) ... */ });

    console.log('Navigating to property page...');
    await page.goto(PROPERTY_URL, { waitUntil: 'domcontentloaded' });
    console.log('Page loaded');
    
    try { /* ... (cookie consent, keep it brief) ... */ 
        console.log('Attempting to handle cookie consent (quick check)...');
        const cookieSelector = '[id*="onetrust-accept-btn"], button[data-testid*="accept"]'; // Example
        if (await waitForSelectorWithTimeout(page, cookieSelector, 5000)) {
            await page.click(cookieSelector, {timeout: 5000});
            console.log('Potential cookie button clicked.');
            await page.waitForTimeout(1500);
        } else {
            console.log('No prominent cookie button found quickly for consent.');
        }
    } catch (e) { console.log('Minor error during cookie consent:', e.message); }
    
    // --- MORE ROBUST WAIT BEFORE "Find a room" ---
    console.log('Waiting for main page content to settle before finding "Find a room" button...');
    try {
       await page.waitForSelector('::-p-text(Rooms available)', { timeout: 20000 }); // Using Puppeteer's text selector
       console.log("'Rooms available' text found, page likely settled.");
    } catch (e) {
       console.warn("Did not find 'Rooms available' text, page might not be fully settled. Proceeding to click 'Find a room' with caution.");
       const pageContentForFindRoomDebug = await page.content();
       await sendDiscordMessage({
           title: "WARNING - Pre-FindRoom Check Failed",
           description: `Could not find "Rooms available" text. URL: ${await page.url()}\nPage HTML (start):\n\`\`\`html\n${pageContentForFindRoomDebug.substring(0,1800)}\n\`\`\``,
           color: 0xFF8C00
       });
    }
    await page.waitForTimeout(2000); // Extra small pause
    // --- END MORE ROBUST WAIT ---

    console.log('Current page URL before Find a Room attempt:', await page.url());
    
    const findRoomSelectors = [
        'button[data-event="book_a_room"][data-property="Pier Quays"]', 
        'button[data-event="book_a_room"]',
        // If using puppeteer-extra with queryHandler
        // 'button[data-cy="button"]:visible:contains("Find a room")',
        // For standard puppeteer, text must be handled by evaluate or text selector `::-p-text(...)`
        // We rely on textContent in enhancedClick as a fallback
    ];
    const findRoomSuccess = await enhancedClick(page, findRoomSelectors, 'Find a room', 'Find a room button');
    if (!findRoomSuccess) {
       const pageContentAtFailure = await page.content();
       await sendDiscordMessage({
           title: "ERROR - Could Not Click 'Find a room'",
           description: `Failed to click "Find a room". URL: ${await page.url()}\nPage HTML (start):\n\`\`\`html\n${pageContentAtFailure.substring(0,1800)}\n\`\`\``,
           color: 0xFF0000
       });
       throw new Error('Could not click "Find a room" button.');
    }
    // --- END "Find a room" CLICK LOGIC ---
    
    console.log('Waiting for page to transition after "Find a room" click...');
    await page.waitForTimeout(7000); 
    
    const urlAfterFindRoom = await page.url();
    const titleAfterFindRoom = await page.title();
    console.log('Current URL after Find Room and initial wait:', urlAfterFindRoom);
    console.log('Page title after Find Room and initial wait:', titleAfterFindRoom);

    console.log('Attempting to locate general room type selection interface (e.g., any button with data-room_type)...');
    if (!await waitForSelectorWithTimeout(page, 'button[data-room_type]', 35000)) { 
        // ... (debug info gathering and throw error - same as v13) ...
        throw new Error("No room type buttons (e.g., [data-room_type]) found/visible. Check Discord for page state dump details.");
    }
    console.log('General room type buttons interface appears to be ready.');

    const ensuiteSuccess = await enhancedClick(page, 
        ['button[data-room_type="ENSUITE"]', 'button[aria-label="Select ENSUITE"]', 'button[aria-label*="En-suite" i]', 'div[role="button"][aria-label*="En-suite" i]'], 
        'En-suite', 'Ensuite option'
    );
    if (!ensuiteSuccess) throw new Error('Could not click "Ensuite" option using enhancedClick.');
    
    // --- Immediate HTML dump logic (same as v13) ---
    console.log("Successfully clicked 'Ensuite'. Waiting a fixed 5 seconds for content to potentially load...");
    await page.waitForTimeout(5000); 
    const urlAfterEnsuite = await page.url();
    const titleAfterEnsuite = await page.title();
    console.log(`State after Ensuite click & 5s wait: URL: ${urlAfterEnsuite}, Title: ${titleAfterEnsuite}`);
    if (DUMP_HTML_AFTER_ENSUITE_CLICK) { /* ... (HTML dump logic - same as v13) ... */ }
    // --- End immediate HTML dump logic ---

    console.log('Now attempting to wait for "Reserve your room" span before contract extraction...');
    if (!await waitForSelectorWithTimeout(page, 'span ::-p-text(Reserve your room)', 20000)) { 
        console.warn("'Reserve your room' span not found even after Ensuite click and HTML dump. Contract extraction will likely fail or find nothing.");
    } else {
        console.log("'Reserve your room' span found after HTML dump attempt.");
    }
    await page.waitForTimeout(1000); 

    console.log(`Current page state for contract extraction: ${await page.title()} | URL: ${await page.url()}`);
    
    console.log('Extracting contract information...');
    const contractsData = await page.evaluate(() => { /* ... (contract extraction logic - same as v9/v10/v13) ... */ });

    let contracts; /* ... (processing contractsData - same as v9/v10/v13) ... */
    
    console.log('Final contracts variable:', JSON.stringify(contracts, null, 2));
    
    if (!contracts || contracts.length === 0) { /* ... (No details found message - same as v9/v10/v13) ... */ } 
    else { /* ... (Process new contracts / standard only message - same as v9/10/v13) ... */ }
    
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
