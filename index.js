// Unite Students Contract Checker Bot - vNext Attempt 15.9
// Test: Direct node-fetch of PROPERTY_URL before Puppeteer launch.
// Puppeteer then does its own minimal goto test with NO interception.
// Request interception is re-enabled AFTER Puppeteer's initial goto test.
// SCRIPT VERSION 15.9 log is present.
// DUMP_HTML_AFTER_ENSUITE_CLICK is true.

console.log("<<<<< SCRIPT VERSION 15.9 IS RUNNING - TOP OF FILE >>>>>"); 

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

async function sendDiscordMessage(content) {
  const webhookUrl = DISCORD_WEBHOOK_URL_FROM_ENV;
  if (!webhookUrl || !webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
    console.warn(`Discord webhook URL appears invalid or is a placeholder. Current URL: "${webhookUrl}". Skipping notification.`);
    return;
  }
  const payload = {
    username: "Unite Students Alert", 
    embeds: [{
        title: content.title,
        description: String(content.description).substring(0, 4090), 
        color: content.color,
        footer: { text: `Checked at ${new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' })}` },
        url: content.url || PROPERTY_URL,
        timestamp: new Date().toISOString()
    }]
  };
  if (content.fields && content.fields.length > 0) {
      payload.embeds[0].fields = content.fields.map(f => ({ 
          name: String(f.name).substring(0, 256), 
          value: String(f.value).substring(0, 1024), 
          inline: f.inline || false
      }));
  }
  try {
    const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        console.error(`Fetch: Error sending Discord message. Status: ${response.status} ${response.statusText}`);
        const responseBody = await response.text();
        console.error("Fetch: Response body:", responseBody.substring(0, 500)); 
    } else {
        console.log('Fetch: Discord notification sent successfully');
    }
  } catch (error) {
      console.error('Fetch: Exception while sending Discord notification:', error.message, error.stack ? error.stack.substring(0,500) : '');
  }
}
console.log("LOG POINT 6: After sendDiscordMessage function definition (using fetch).");

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
  for (const selector of Array.isArray(selectors) ? selectors : [selectors]) {
    try {
      console.log(`Attempting to click ${description} using selector: ${selector}`);
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
        // ... (textContent click logic from v15 - unchanged) ...
      } catch (e) { /* ... */ }
  }
  console.log(`Could not click ${description} using any provided method in enhancedClick.`);
  return false;
}
console.log("LOG POINT 8: After enhancedClick function definition");

async function checkForContracts() {
  console.log("<<<<< CHECKFORCONTRACTS FUNCTION ENTERED (v15.9) >>>>>");
  console.log(`[${new Date().toISOString()}] Running contract check...`);
  let browser = null;
  let page = null;
  
  try {
    // ---- Direct node-fetch Test for PROPERTY_URL ----
    console.log(`Attempting direct fetch of PROPERTY_URL: ${PROPERTY_URL} with node-fetch...`);
    let directHtmlContainsBody = false;
    let directFetchStatus = "Unknown";
    try {
        const commonUserAgentForFetch = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.2478.80';
        const directResponse = await fetch(PROPERTY_URL, {
            headers: { 'User-Agent': commonUserAgentForFetch },
            timeout: 45000 
        });
        directFetchStatus = `${directResponse.status} ${directResponse.statusText}`;
        console.log(`Direct fetch status for ${PROPERTY_URL}: ${directFetchStatus}`);
        
        const directHtml = await directResponse.text();
        console.log("Direct fetch HTML (first 1KB for console):", directHtml.substring(0, 1024));
        
        directHtmlContainsBody = directHtml.toLowerCase().includes("<body");
        
        await sendDiscordMessage({
            title: "DEBUG - Direct Fetch PROPERTY_URL Snapshot",
            description: `Status: ${directFetchStatus}\nContains <body> tag: ${directHtmlContainsBody}\nHTML (start):\n\`\`\`html\n${directHtml.substring(0,1800)}\n\`\`\``,
            color: directResponse.ok && directHtmlContainsBody ? 0x00FF00 : 0xFF8C00 
        });

        if (!directResponse.ok) console.error(`Direct fetch failed: HTTP Status ${directResponse.status}`);
        if (!directHtmlContainsBody) console.warn("WARNING: Direct fetch HTML for PROPERTY_URL does NOT appear to contain a <body> tag!");

    } catch (directFetchError) {
        directFetchStatus = `Exception: ${directFetchError.message}`;
        console.error("Error during direct fetch of PROPERTY_URL:", directFetchError.message, directFetchError.stack ? directFetchError.stack.substring(0,500) : '');
        await sendDiscordMessage({ title: "❌ ERROR - Direct Fetch PROPERTY_URL Failed", description: `Error: ${directFetchError.message}`, color: 0xFF0000 });
    }
    console.log(`<<<<< CHECKFORCONTRACTS: Direct node-fetch test completed. Status: ${directFetchStatus}, Contained Body: ${directHtmlContainsBody} >>>>>`);
    // ---- END Direct node-fetch Test ----

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
    console.log("<<<<< CHECKFORCONTRACTS: Page setup complete. >>>>>");

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
            await sendDiscordMessage({
                title: "DEBUG - Puppeteer Minimal Goto Response",
                description: `URL: ${urlAfterGoto}\nStatus: ${httpResponse.status()} ${httpResponse.statusText()}\nHeaders (partial): \`\`\`json\n${JSON.stringify(httpResponse.headers(), null, 2).substring(0,1500)}\n\`\`\``,
                color: 0x1ABC9C 
            });

            if (httpResponse.ok()) {
                console.log('Attempting to get Puppeteer page.content() snapshot...');
                contentAfterGoto = await page.content();
                console.log('Puppeteer Page content snapshot obtained (first 3KB for console):', contentAfterGoto.substring(0, 3000));
                await sendDiscordMessage({
                    title: "DEBUG - Puppeteer Minimal Goto HTML Snapshot",
                    description: `URL: ${urlAfterGoto}\nTitle: ${titleAfterGoto}\n\nHTML (start):\n\`\`\`html\n${contentAfterGoto.substring(0,1800)}\n\`\`\``,
                    color: 0x2ECC71 
                });

                const bodyExists = await page.evaluate(() => document.body !== null && typeof document.body !== 'undefined');
                console.log("Puppeteer Check: Does document.body exist? Result:", bodyExists);
                await sendDiscordMessage({ title: "DEBUG - Puppeteer Body DOM Existence Check", description: `document.body exists: ${bodyExists}`, color: bodyExists ? 0x2ECC71 : 0xFF8C00 });

                if (!bodyExists) {
                    throw new Error("Puppeteer: document.body was null or undefined after goto and content retrieval.");
                }
                console.log("Puppeteer: Body DOM element exists. Now waiting for it with waitForSelector (short)...");
                if(!await waitForSelectorWithTimeout(page, 'body', 10000)){ 
                    console.warn("Puppeteer: Body exists in DOM, but waitForSelector('body', {visible:true}) timed out.");
                } else {
                    console.log("Puppeteer: Body tag also confirmed by waitForSelector.");
                }

            } else { /* ... HTTP Not OK error handling ... */ }
        } else { /* ... null response error handling ... */ }

    } catch (puppeteerGotoError) {
        console.error(`<<<<< CHECKFORCONTRACTS: ERROR IN PUPPETEER GOTO OR RESPONSE CHECK >>>>>`);
        console.error(`Error: ${puppeteerGotoError.message}`, puppeteerGotoError.stack);
        await sendDiscordMessage({
            title: "❌ ERROR - Puppeteer Minimal Goto/Response Failed",
            description: `Puppeteer page.goto or response processing failed: ${puppeteerGotoError.message}\nURL: ${PROPERTY_URL}\nContent Attempt (start): ${contentAfterGoto.substring(0,500)}`,
            color: 0xFF0000
        });
        throw puppeteerGotoError; 
    }
    console.log("<<<<< CHECKFORCONTRACTS: Puppeteer initial page.goto() and basic checks passed. >>>>>");
    
    console.log("Re-enabling request interception for further navigation...");
    await page.setRequestInterception(true); 
    page.on('request', (request) => { 
        const resourceType = request.resourceType();
        const url = request.url().toLowerCase();
        if (['image', 'media'].includes(resourceType) ) { request.abort(); } 
        else if (resourceType === 'font' && !url.includes('essential')) { request.abort(); } 
        else if (url.includes('analytics') || url.includes('tracking') || url.includes('hotjar') || url.includes('googletagmanager')) { request.abort(); } 
        else { request.continue(); }
    });

    try { /* ... (cookie consent) ... */ } catch (e) { console.log('Minor error during cookie consent:', e.message); }
    
    console.log('Waiting for main page interactive elements ("Rooms available" text)...');
    try {
       await page.waitForSelector('::-p-text(Rooms available)', { timeout: 30000 });
       console.log("'Rooms available' text found, page likely settled for interaction.");
    } catch (e) {
       console.warn("Did not find 'Rooms available' text after primary structure checks. Proceeding with 'Find a room' click with caution.");
       const pageContentForFindRoomDebug = await page.content();
       await sendDiscordMessage({
           title: "WARNING - 'Rooms available' Not Found",
           description: `Could not find "Rooms available" text before 'Find a room' click. URL: ${await page.url()}\nPage HTML (start):\n\`\`\`html\n${pageContentForFindRoomDebug.substring(0,1800)}\n\`\`\``,
           color: 0xFF8C00
       });
    }
    await page.waitForTimeout(2000); 
    
    console.log('Current page URL before Find a Room attempt:', await page.url());
    const findRoomSelectors = [
        'button[data-event="book_a_room"][data-property="Pier Quays"]', 
        'button[data-event="book_a_room"]',
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
    
    console.log('Waiting for page to transition after "Find a room" click...');
    await page.waitForTimeout(7000); 
    
    const urlAfterFindRoom = await page.url();
    const titleAfterFindRoom = await page.title();
    console.log('Current URL after Find Room and initial wait:', urlAfterFindRoom);
    console.log('Page title after Find Room and initial wait:', titleAfterFindRoom);

    console.log('Attempting to locate general room type selection interface (e.g., any button with data-room_type)...');
    if (!await waitForSelectorWithTimeout(page, 'button[data-room_type]', 35000)) { 
        const dbgUrl = await page.url(); const dbgTitle = await page.title(); const dbgHTML = await page.content();
        await sendDiscordMessage({title: "ERROR - No Room Type Buttons After FindRoom", description: `URL: ${dbgUrl}\nTitle: ${dbgTitle}\nHTML(start):\n\`\`\`html\n${dbgHTML.substring(0,1800)}\n\`\`\``, color:0xFF0000});
        throw new Error("No room type buttons (e.g., [data-room_type]) found/visible. Check Discord for page state dump details.");
    }
    console.log('General room type buttons interface appears to be ready.');

    const ensuiteSuccess = await enhancedClick(page, 
        ['button[data-room_type="ENSUITE"]', 'button[aria-label="Select ENSUITE"]', 'button[aria-label*="En-suite" i]', 'div[role="button"][aria-label*="En-suite" i]'], 
        'En-suite', 'Ensuite option'
    );
    if (!ensuiteSuccess) throw new Error('Could not click "Ensuite" option using enhancedClick.');
    
    // --- Immediate HTML dump logic (same as v15.7) ---
    console.log("Successfully clicked 'Ensuite'. Waiting a fixed 5 seconds for content to potentially load...");
    await page.waitForTimeout(5000); 
    const urlAfterEnsuite = await page.url();
    const titleAfterEnsuite = await page.title();
    console.log(`State after Ensuite click & 5s wait: URL: ${urlAfterEnsuite}, Title: ${titleAfterEnsuite}`);
    if (DUMP_HTML_AFTER_ENSUITE_CLICK) { /* ... (HTML dump logic - same as v15.7) ... */ }
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
    const contractsData = await page.evaluate(() => { /* ... (contract extraction logic - same as v9/v10/v13/v15) ... */ });

    let contracts; /* ... (processing contractsData - same as v9/v10/v13/v15) ... */
    
    console.log('Final contracts variable:', JSON.stringify(contracts, null, 2));
    
    if (!contracts || contracts.length === 0) { /* ... (No details found message - same as v9/v10/v13/v15) ... */ } 
    else { /* ... (Process new contracts / standard only message - same as v9/10/v13/v15) ... */ }
    
  } catch (error) {
    console.error('<<<<< CHECKFORCONTRACTS: ERROR CAUGHT IN MAIN TRY-CATCH >>>>>');
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
        console.log("<<<<< SCRIPT VERSION 15.9 - ASYNC IIFE ENTERED >>>>>"); 
        try {
            console.log("<<<<< SCRIPT VERSION 15.9 - CHECKFORCONTRACTS INVOKING NOW... >>>>>");
            await checkForContracts();
            console.log("<<<<< SCRIPT VERSION 15.9 - CHECKFORCONTRACTS CALL COMPLETED >>>>>");
        } catch (iifeError) {
            console.error("<<<<< SCRIPT VERSION 15.9 - ERROR IN STARTUP ASYNC IIFE >>>>>", iifeError.message, iifeError.stack ? iifeError.stack.substring(0,1000) : "No stack in IIFE error");
            await sendDiscordMessage({
                title: "❌ CRITICAL STARTUP ERROR (IIFE)",
                description: `The main async startup function failed: ${iifeError.message}\nStack: ${iifeError.stack ? iifeError.stack.substring(0,1000) : 'No stack'}`,
                color: 0xFF0000
            });
        }
        console.log("HTML DUMP (Post-Ensuite) debug run complete (after IIFE).");
    })();
} else { 
    const startupDelay = Math.floor(Math.random() * 7000) + 3000; 
    console.log(`Bot starting initial check in ${startupDelay/1000}s... (Normal mode)`);
    setTimeout(checkForContracts, startupDelay);
}
console.log("LOG POINT 14: After Startup Logic initiated");

process.on('SIGINT', () => { console.log('Bot shutting down...'); process.exit(0); });
process.on('uncaughtException', (err) => { 
    console.error('<<<<< UNCAUGHT GLOBAL EXCEPTION >>>>>');
    console.error(err.message, err.stack); 
    sendDiscordMessage({
        title: "❌ CRITICAL - UNCAUGHT EXCEPTION",
        description: `A global uncaught exception occurred: ${err.message}\nStack: ${err.stack ? err.stack.substring(0,1000) : 'No stack'}`,
        color: 0xFF0000
    }).catch(e => console.error("Failed to send Discord message for uncaught exception:", e));
});
console.log("LOG POINT 15: Event listeners for SIGINT and uncaughtException set up. Script fully parsed.");
console.log("<<<<< SCRIPT VERSION 15.9 HAS FINISHED PARSING - BOTTOM OF FILE >>>>>");
