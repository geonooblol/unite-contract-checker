// Unite Students Contract Checker Bot - vNext Attempt 15.6
// More logging in startup IIFE and start of checkForContracts.

console.log("<<<<< SCRIPT VERSION 15.6 IS RUNNING - TOP OF FILE >>>>>"); 

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

// DUMP_HTML_AFTER_ENSUITE_CLICK is kept from previous logic, will apply if reached
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

async function waitForSelectorWithTimeout(page, selector, timeout = 10000) { /* ... (unchanged) ... */ }
console.log("LOG POINT 7: After waitForSelectorWithTimeout function definition");

async function enhancedClick(page, selectors, textContent, description = "element") { /* ... (unchanged) ... */ }
console.log("LOG POINT 8: After enhancedClick function definition");

async function checkForContracts() {
  // ---- ADD LOG AT THE VERY START OF THIS FUNCTION ----
  console.log("<<<<< CHECKFORCONTRACTS FUNCTION ENTERED >>>>>");
  // ----------------------------------------------------
  console.log(`[${new Date().toISOString()}] Running contract check...`);
  let browser = null;
  let page = null;
  
  try {
    console.log("Attempting to fetch google.com as a basic network test...");
    try { 
        const googleResponse = await fetch('https://www.google.com', { timeout: 15000 });
        console.log(`Google fetch status: ${googleResponse.status}`);
        if (googleResponse.ok) { 
            console.log("Successfully fetched google.com.");
            // await sendDiscordMessage({title: "NETWORK TEST OK", description: "Successfully fetched google.com.", color: 0x00FF00}); // Muted for now
        } else {
            console.error("Failed to fetch google.com, basic network issue might exist.");
            // await sendDiscordMessage({title: "NETWORK TEST FAIL", description: `Could not fetch google.com. Status: ${googleResponse.status}`, color: 0xFF0000}); // Muted
        }
    } catch (fetchError) {
        console.error("Error fetching google.com:", fetchError.message);
        // await sendDiscordMessage({title: "NETWORK TEST EXCEPTION", description: `Error fetching google.com: ${fetchError.message}`, color: 0xFF0000}); // Muted
    }

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
    console.log("<<<<< CHECKFORCONTRACTS: Browser launched successfully. >>>>>");

    page = await browser.newPage();
    console.log("<<<<< CHECKFORCONTRACTS: New page created. >>>>>");
    
    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT); 
    page.setDefaultTimeout(PAGE_TIMEOUT); 
    
    await page.setRequestInterception(true);
    page.on('request', (request) => { 
        const resourceType = request.resourceType();
        const url = request.url().toLowerCase();
        if (['image', 'media'].includes(resourceType) ) { request.abort(); } 
        else if (resourceType === 'font' && !url.includes('essential')) { request.abort(); } 
        else if (url.includes('analytics') || url.includes('tracking') || url.includes('hotjar') || url.includes('googletagmanager')) { request.abort(); } 
        else { request.continue(); }
    });
    console.log("<<<<< CHECKFORCONTRACTS: Page setup complete (viewport, UA, interception). >>>>>");


    console.log(`Navigating to property page (NO waitUntil, interception ON, ${INITIAL_GOTO_TIMEOUT}ms timeout)...`);
    let initialContentSnapshot = "No content snapshot taken yet.";
    let initialUrl = "unknown";
    let initialTitle = "unknown";

    try {
        await page.goto(PROPERTY_URL, { timeout: INITIAL_GOTO_TIMEOUT }); 
        initialUrl = await page.url();
        initialTitle = await page.title();
        console.log(`page.goto() resolved. Current URL: ${initialUrl}, Title: ${initialTitle}`);

        console.log('Attempting to get page content snapshot immediately after minimal goto...');
        initialContentSnapshot = await page.content();
        
        await sendDiscordMessage({
            title: "DEBUG - Minimal Goto Snapshot",
            description: `URL: ${initialUrl}\nTitle: ${initialTitle}\n\nHTML (start):\n\`\`\`html\n${initialContentSnapshot.substring(0,1800)}\n\`\`\``,
            color: 0x2ECC71 
        });

        console.log("Waiting for body tag to be present (extended timeout)...");
        if (!await waitForSelectorWithTimeout(page, 'body', 30000)) { 
            console.error("Page body tag did not become available. Content received (start):", initialContentSnapshot.substring(0,500));
            throw new Error("Page body tag did not become available after minimal goto.");
        }
        console.log("Body tag found.");

        console.log("Waiting for a primary page structure indicator (e.g., #__next main, footer, etc.)...");
        const primaryContentSelectors = [ /* ... (selectors from v15.5) ... */ ];
        // ... (loop and check primaryContentSelectors - same as v15.5) ...
        
        await page.waitForTimeout(5000); 

    } catch (gotoError) {
        console.error(`<<<<< CHECKFORCONTRACTS: ERROR IN GOTO OR INITIAL STRUCTURE CHECK >>>>>`);
        console.error(`Error during page.goto() or initial content/structure check: ${gotoError.message}`, gotoError.stack);
        await sendDiscordMessage({
            title: "❌ ERROR - Goto or Initial Structure Failed",
            description: `page.goto (no waitUntil) or structure check failed: ${gotoError.message}\nURL attempted: ${PROPERTY_URL}\nSnapshot attempt (start): ${initialContentSnapshot.substring(0,500)}`,
            color: 0xFF0000
        });
        throw gotoError; 
    }
    console.log("<<<<< CHECKFORCONTRACTS: Initial page load and structure checks passed. >>>>>");
    
    try { /* ... (cookie consent) ... */ } catch (e) { console.log('Minor error during cookie consent:', e.message); }
    
    console.log('Waiting for main page interactive elements to settle (e.g. "Rooms available" text)...');
    try { /* ... (wait for "Rooms available") ... */ } catch (e) { /* ... */ }
    await page.waitForTimeout(2000); 
    
    console.log('Current page URL before Find a Room attempt:', await page.url());
    const findRoomSelectors = [ /* ... (same) ... */ ];
    const findRoomSuccess = await enhancedClick(page, findRoomSelectors, 'Find a room', 'Find a room button');
    if (!findRoomSuccess) { /* ... (error) ... */ throw new Error('Could not click "Find a room" button.'); }
    
    // ... (Rest of the script: ensuite click, DUMP_HTML_AFTER_ENSUITE_CLICK logic, contract extraction) ...
    // This part remains the same as v15.5
    
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
        console.log("<<<<< SCRIPT VERSION 15.6 - ASYNC IIFE ENTERED >>>>>"); 
        try {
            console.log("<<<<< SCRIPT VERSION 15.6 - CHECKFORCONTRACTS INVOKING NOW... >>>>>");
            await checkForContracts();
            console.log("<<<<< SCRIPT VERSION 15.6 - CHECKFORCONTRACTS CALL COMPLETED >>>>>");
        } catch (iifeError) {
            console.error("<<<<< SCRIPT VERSION 15.6 - ERROR IN STARTUP ASYNC IIFE >>>>>", iifeError.message, iifeError.stack ? iifeError.stack.substring(0,1000) : "No stack in IIFE error");
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
    // Attempt to send a last-gasp Discord message for uncaught exceptions
    // This is not guaranteed to work if the process is too unstable
    sendDiscordMessage({
        title: "❌ CRITICAL - UNCAUGHT EXCEPTION",
        description: `A global uncaught exception occurred: ${err.message}\nStack: ${err.stack ? err.stack.substring(0,1000) : 'No stack'}`,
        color: 0xFF0000
    }).catch(e => console.error("Failed to send Discord message for uncaught exception:", e));
    // process.exit(1); // Optional: ensure process exits after uncaught exception
});
console.log("LOG POINT 15: Event listeners for SIGINT and uncaughtException set up. Script fully parsed.");
console.log("<<<<< SCRIPT VERSION 15.6 HAS FINISHED PARSING - BOTTOM OF FILE >>>>>");
