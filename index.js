// Unite Students Contract Checker Bot - vNext Attempt 7
// Using node-fetch for Discord messages.

// --- ENV VAR CHECK AT THE VERY TOP ---
console.log("--- INIT: ENV VAR CHECK (RAW) ---");
console.log("Raw process.env.DISCORD_WEBHOOK_URL:", process.env.DISCORD_WEBHOOK_URL);
console.log("Typeof raw process.env.DISCORD_WEBHOOK_URL:", typeof process.env.DISCORD_WEBHOOK_URL);
console.log("--- END INIT: ENV VAR CHECK (RAW) ---");

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const cron = require('node-cron');
const fetch = require('node-fetch'); // Using node-fetch

const dotenv = require('dotenv');
dotenv.config(); 

const DISCORD_WEBHOOK_URL_FROM_ENV = process.env.DISCORD_WEBHOOK_URL; 
console.log("DISCORD_WEBHOOK_URL_FROM_ENV (to be used by fetch):", DISCORD_WEBHOOK_URL_FROM_ENV);

const CHECK_INTERVAL = process.env.CHECK_INTERVAL || '0 */4 * * *';
const PROPERTY_URL = 'https://www.unitestudents.com/student-accommodation/medway/pier-quays';

const NAVIGATION_TIMEOUT = 75000; 
const PAGE_TIMEOUT = 100000;    

// Set DUMP_HTML to true if you need to debug the contract section HTML again.
// For now, focusing on getting past the "No room type buttons" error with fetch notifications.
const DUMP_CONTRACT_SECTION_HTML_FOR_DEBUG = process.env.DEBUG_HTML_DUMP === 'true' || true; 

async function sendDiscordMessage(content) {
  const webhookUrl = DISCORD_WEBHOOK_URL_FROM_ENV;

  if (!webhookUrl || !webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
    console.warn(`Discord webhook URL appears invalid or is a placeholder. Current URL: "${webhookUrl}". Skipping notification.`);
    return;
  }

  const payload = {
    username: "Unite Students Alert", // Optional: Bot's name in Discord
    // avatar_url: "YOUR_BOT_AVATAR_URL_HERE", // Optional
    embeds: [{
        title: content.title,
        description: content.description.substring(0, 4090), // Discord limit for description
        color: content.color,
        footer: { text: `Checked at ${new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' })}` },
        url: content.url || PROPERTY_URL,
        timestamp: new Date().toISOString()
    }]
  };

  if (content.fields && content.fields.length > 0) {
      payload.embeds[0].fields = content.fields.map(f => ({ 
          name: String(f.name).substring(0, 256), // Field name limit
          value: String(f.value).substring(0, 1024), // Field value limit
          inline: f.inline || false
      }));
  }

  try {
    // console.log(`Attempting to send message via fetch to: ${webhookUrl.substring(0, webhookUrl.lastIndexOf('/'))}/... Payload:`, JSON.stringify(payload).substring(0,200));
    const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        console.error(`Fetch: Error sending Discord message. Status: ${response.status} ${response.statusText}`);
        const responseBody = await response.text();
        console.error("Fetch: Response body:", responseBody.substring(0, 500)); // Log part of the error body from Discord
        // Avoid sending another message if the webhook itself is the problem.
    } else {
        console.log('Fetch: Discord notification sent successfully');
    }
  } catch (error) {
      console.error('Fetch: Exception while sending Discord notification:', error.message, error.stack ? error.stack.substring(0,500) : '');
  }
}

async function waitForSelectorWithTimeout(page, selector, timeout = 10000) {
  try {
    await page.waitForSelector(selector, { visible: true, timeout });
    return true;
  } catch (error) {
    return false;
  }
}

async function enhancedClick(page, selectors, textContent, description = "element") {
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
  if (textContent) { /* ... (textContent click logic - unchanged for now) ... */ }
  console.log(`Could not click ${description} using any provided method.`);
  return false;
}

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
        '--disable-gpu', '--window-size=1366,768'
      ],
      protocolTimeout: 180000 
    });
    
    page = await browser.newPage();
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
    
    try { /* ... (cookie consent - unchanged for now) ... */ } catch (e) { console.log('Minor error during cookie consent:', e.message); }
    
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
        let currentUrlAtFailure = "unknown";
        let pageTitleAtFailure = "unknown";
        let pageContentSnapshot = "Could not get page content.";
        try {
            currentUrlAtFailure = await page.url();
            pageTitleAtFailure = await page.title();
            console.log(`DEBUG: URL at failure: ${currentUrlAtFailure}`);
            console.log(`DEBUG: Title at failure: ${pageTitleAtFailure}`);
            pageContentSnapshot = await page.content(); 
            console.log("DEBUG: Page HTML snapshot (first 3KB for console):", pageContentSnapshot.substring(0,3000));
            const DUMP_LIMIT = 1800; 
            await sendDiscordMessage({
                title: "ERROR - No Room Type Buttons", 
                description: `URL: ${currentUrlAtFailure}\nTitle: ${pageTitleAtFailure}\n\nPage HTML (start):\n\`\`\`html\n${pageContentSnapshot.substring(0, DUMP_LIMIT)}\n\`\`\``, 
                color:0xFF0000
            });
            if (pageContentSnapshot.length > DUMP_LIMIT) {
                 await sendDiscordMessage({ title: "ERROR - No Room Type Buttons (HTML cont.)", description: `\`\`\`html\n${pageContentSnapshot.substring(DUMP_LIMIT, DUMP_LIMIT*2)}\n\`\`\``, color:0xFF0000 });
            }
        } catch (debugErr) {
            console.error("Error during debug info gathering (URL/title/content):", debugErr.message);
            await sendDiscordMessage({ title: "ERROR - Debug Info Gathering Failed", description: `Failed to get full debug info. Initial error was 'No room type buttons'. Debug attempt error: ${debugErr.message}`, color: 0xFF0000 });
        }
        throw new Error("No room type buttons (e.g., [data-room_type]) found/visible. Check Discord for page state dump.");
    }
    console.log('General room type buttons interface appears to be ready.');

    const ensuiteSuccess = await enhancedClick(page, 
        ['button[data-room_type="ENSUITE"]', 'button[aria-label="Select ENSUITE"]', 'button[aria-label*="En-suite" i]', 'div[role="button"][aria-label*="En-suite" i]'], 
        'En-suite', 'Ensuite option'
    );
    if (!ensuiteSuccess) throw new Error('Could not click "Ensuite" option using enhancedClick.');
    
    console.log('Waiting for contract options to appear/load...');
    if (!await waitForSelectorWithTimeout(page, 'span ::-p-text(Reserve your room)', 30000)) { /* ... (unchanged for now) ... */ }
    await page.waitForTimeout(3000); 

    console.log(`On page for contract extraction: ${await page.title()} | URL: ${await page.url()}`);

    if (DUMP_CONTRACT_SECTION_HTML_FOR_DEBUG) { /* ... (HTML dump logic - unchanged, should use new sendDiscordMessage) ... */ }
    
    console.log('Extracting contract information...');
    const contracts = await page.evaluate(() => { /* ... (contract extraction logic - unchanged from vNext Attempt 3/4) ... */ });
    
    console.log('Extracted contracts:', JSON.stringify(contracts, null, 2));
    
    if (!contracts || contracts.length === 0) { /* ... (No details found message) ... */ } 
    else { /* ... (Process new contracts / standard only message) ... */ }
    
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

// --- Health check and scheduling (unchanged) ---
if (process.env.ENABLE_HEALTH_CHECK === 'true') { /* ... */ }
cron.schedule(CHECK_INTERVAL, checkForContracts, { scheduled: true, timezone: 'Europe/London' });

// --- Startup Logic (unchanged) ---
if (DUMP_CONTRACT_SECTION_HTML_FOR_DEBUG) { /* ... */ } 
else { /* ... */ }

process.on('SIGINT', () => { console.log('Bot shutting down...'); process.exit(0); });
process.on('uncaughtException', (err) => { console.error('Uncaught global exception:', err.message, err.stack); });
