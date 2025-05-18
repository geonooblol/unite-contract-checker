// Unite Students Contract Checker Bot - vNext Attempt 11
// Re-enabling node-fetch for Discord messages.
// DUMP_CONTRACT_SECTION_HTML_FOR_DEBUG is true for this run.

// --- ENV VAR CHECK AT THE VERY TOP ---
console.log("--- INIT: ENV VAR CHECK (RAW) ---"); 
console.log("Raw process.env.DISCORD_WEBHOOK_URL:", process.env.DISCORD_WEBHOOK_URL);
console.log("Typeof raw process.env.DISCORD_WEBHOOK_URL:", typeof process.env.DISCORD_WEBHOOK_URL);
console.log("--- END INIT: ENV VAR CHECK (RAW) ---");

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const cron = require('node-cron');
const fetch = require('node-fetch'); // <<<< RE-ENABLING node-fetch
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

const DUMP_CONTRACT_SECTION_HTML_FOR_DEBUG = process.env.DEBUG_HTML_DUMP === 'true' || true; // Ensure this is true for the run
console.log("LOG POINT 5: After DUMP_HTML const. DUMP_HTML_FOR_DEBUG is:", DUMP_CONTRACT_SECTION_HTML_FOR_DEBUG);


async function sendDiscordMessage(content) {
  // <<<< Using node-fetch implementation from vNext Attempt 7 >>>>
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
    // console.log(`Attempting to send message via fetch to: ${webhookUrl.substring(0, webhookUrl.lastIndexOf('/'))}/...`);
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
console.log("LOG POINT 6: After sendDiscordMessage function definition (now using fetch).");


async function waitForSelectorWithTimeout(page, selector, timeout = 10000) {
  // ... (function body unchanged)
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
      args: [
        '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas', '--no-first-run', '--no-zygote',
        '--disable-gpu'
      ],
      protocolTimeout: 180000 
    });
    
    page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    // ... (useragent, timeouts, request interception - same as v10) ...
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
        // ... (debug info gathering and throw error - same as v10, will now use fetch-based sendDiscordMessage) ...
        console.error("No room type buttons (e.g., [data-room_type]) found/visible in time even after extended wait.");
        let currentUrlAtFailure = "unknown"; let pageTitleAtFailure = "unknown"; let pageContentSnapshot = "Could not get page content.";
        try {
            currentUrlAtFailure = await page.url(); pageTitleAtFailure = await page.title();
            console.log(`DEBUG: URL at failure: ${currentUrlAtFailure}`); console.log(`DEBUG: Title at failure: ${pageTitleAtFailure}`);
            pageContentSnapshot = await page.content(); 
            console.log("DEBUG: Page HTML snapshot (first 3KB for console):", pageContentSnapshot.substring(0,3000));
            const DUMP_LIMIT = 1800; 
            await sendDiscordMessage({ title: "ERROR - No Room Type Buttons",  description: `URL: ${currentUrlAtFailure}\nTitle: ${pageTitleAtFailure}\n\nPage HTML (start):\n\`\`\`html\n${pageContentSnapshot.substring(0, DUMP_LIMIT)}\n\`\`\``,  color:0xFF0000 });
            if (pageContentSnapshot.length > DUMP_LIMIT) { await sendDiscordMessage({ title: "ERROR - No Room Type Buttons (HTML cont.)", description: `\`\`\`html\n${pageContentSnapshot.substring(DUMP_LIMIT, DUMP_LIMIT*2)}\n\`\`\``, color:0xFF0000 }); }
        } catch (debugErr) { /* ... */ }
        throw new Error("No room type buttons (e.g., [data-room_type]) found/visible. Check Discord for page state dump details.");
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

    // --- HTML DUMP LOGIC ---
    if (DUMP_CONTRACT_SECTION_HTML_FOR_DEBUG) {
        console.log("---- DEBUG: Attempting to dump HTML for contract section ----");
        await sendDiscordMessage({ title: "DEBUG HTML DUMP Active", description: "Attempting to grab HTML of contract section.", color: 0xFFFF00 }); // Now uses fetch
        try {
            await page.waitForSelector('span, div', {timeout: 5000}); 
            const reserveSectionHTML = await page.evaluate(() => {
                const reserveHeadingText = "Reserve your room"; 
                const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, span, p, div'));
                const targetHeading = headings.find(el => el.textContent.trim().toLowerCase().includes(reserveHeadingText.toLowerCase()));
                if (targetHeading) {
                    let container = targetHeading.closest('div[class*="mt-"]'); 
                    if (!container) container = targetHeading.closest('section');
                    if (!container) container = targetHeading.parentElement;
                    while(container && container.parentElement && container.textContent.length < 500 && container.children.length < 10) { container = container.parentElement; }
                    return container ? container.outerHTML : `Found "${reserveHeadingText}" but no suitable parent.`;
                }
                return `Could not find heading/span containing "${reserveHeadingText}". Body snapshot: ` + (document.body ? document.body.innerText.substring(0, 1000) : "No body");
            });
            console.log("---- HTML DUMP FOR CONTRACT SECTION (first 15KB for console) ----\n", reserveSectionHTML.substring(0, 15000), "\n---- END HTML DUMP ----");
            const chunks = [];
            for (let i = 0; i < reserveSectionHTML.length; i += 1900) chunks.push(reserveSectionHTML.substring(i, i + 1900));
            for (const chunk of chunks) {
                await sendDiscordMessage({ title: "DEBUG Contract Section HTML", description: `\`\`\`html\n${chunk}\n\`\`\``, color: 0x0000FF });
                await page.waitForTimeout(500); 
            }
        } catch (htmlError) {
            console.log("Error trying to get specific HTML for debug: ", htmlError.message);
            await sendDiscordMessage({ title: "DEBUG HTML DUMP FAILED", description: htmlError.message, color: 0xFF0000 });
        }
    }
    // --- END HTML DUMP LOGIC ---
    
    console.log('Extracting contract information...');
    const contractsData = await page.evaluate(() => {
        try { // Internal try...catch for page.evaluate (same as v9)
            const results = []; 
            function findContractTerms(contextNode) { /* ... (same as v9) ... */ }
            if (!findContractTerms(document)) { /* ... */ }
            if (results.length === 0) { /* ... broad scan ... */ }
            return { success: true, data: results, error: null, browserLogs: [] }; 
        } catch (e) {
            console.error("Error INSIDE page.evaluate for contract extraction:", e.toString(), e.stack); 
            return { success: false, data: [], error: e.toString() + "\nStack: " + (e.stack || 'No stack available') };
        }
    });

    let contracts;
    if (contractsData && contractsData.success) { /* ... (same as v9) ... */ } 
    else if (contractsData) { /* ... (same as v9, will use new sendDiscordMessage) ... */ } 
    else { /* ... (same as v9, will use new sendDiscordMessage) ... */ }
    
    console.log('Final contracts variable:', JSON.stringify(contracts, null, 2));
    
    if (!contracts || contracts.length === 0) { 
        if (!(contractsData && !contractsData.success)) { 
            await sendDiscordMessage({ title: '❓ Contract Check - No Details Found', description: `The bot couldn't find any contract information. (page.evaluate success: ${contractsData ? contractsData.success : 'N/A'})`, color: 15105570, url: await page.url() });
        }
    } 
    else { /* ... (Process new contracts / standard only message - will use new sendDiscordMessage) ... */ }
    
  } catch (error) {
    console.error('Error during check:', error.message, error.stack ? error.stack.substring(0,1000) : 'No stack'); 
    let errorDetails = `Error: ${error.message}\nStack: ${error.stack ? error.stack.substring(0,1000) : 'No stack'}`;
    if (page) { /* ... (error details URL/Title - will use new sendDiscordMessage) ... */ }
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
