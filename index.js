// Unite Students Contract Checker Bot - vNext Attempt 5
// TEMPORARY HARDCODING of webhook URL for diagnosis.

// --- ENV VAR CHECK AT THE VERY TOP ---
console.log("--- INIT: ENV VAR CHECK (RAW) ---");
console.log("Raw process.env.DISCORD_WEBHOOK_URL:", process.env.DISCORD_WEBHOOK_URL);
console.log("Typeof raw process.env.DISCORD_WEBHOOK_URL:", typeof process.env.DISCORD_WEBHOOK_URL);
console.log("--- END INIT: ENV VAR CHECK (RAW) ---");

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const { Webhook, MessageBuilder } = require('discord-webhook-node');
const cron = require('node-cron');

const dotenv = require('dotenv');
dotenv.config(); 

console.log("--- AFTER DOTENV: ENV VAR CHECK ---");
const ASSIGNED_WEBHOOK_URL_FROM_ENV = process.env.DISCORD_WEBHOOK_URL; 
console.log("ASSIGNED_WEBHOOK_URL_FROM_ENV:", ASSIGNED_WEBHOOK_URL_FROM_ENV);
console.log("Typeof ASSIGNED_WEBHOOK_URL_FROM_ENV:", typeof ASSIGNED_WEBHOOK_URL_FROM_ENV);
console.log("--- END AFTER DOTENV: ENV VAR CHECK ---");

// --- MODIFIED WEBHOOK INITIALIZATION WITH TEMPORARY HARDCODING ---
const placeholderUrl = 'https://discord.com/api/webhooks/your-webhook-url-placeholder';

// --- !!! TEMPORARY HARDCODING FOR DIAGNOSIS !!! ---
// vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv
// PASTE YOUR ACTUAL DISCORD WEBHOOK URL BETWEEN THE QUOTES ON THE NEXT LINE:
const THE_ACTUAL_URL_STRING_TO_TEST = "https://discord.com/api/webhooks/1373352326160584744/KvT0AGjoczodqXHWC6mdIFnDzt58zjGxPP48RPQkJ0rmL8qK6QSOg1YNsyncYRXQ1Dyl"; 
// ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
console.log("TEST: Directly hardcoded URL string being used for new Webhook():", THE_ACTUAL_URL_STRING_TO_TEST);

const hook = new Webhook({
    url: THE_ACTUAL_URL_STRING_TO_TEST, // Using the directly hardcoded string
    throwErrors: true, 
    retryOnLimit: false 
});
console.log("Webhook object initialized with HARDCODED URL. Actual URL being used by 'hook':", hook.url);

if (!hook.url || hook.url === placeholderUrl || !hook.url.startsWith('https://discord.com/api/webhooks/')) {
    console.error(`CRITICAL (with hardcode): Webhook URL is STILL not set correctly in hook object. hook.url is: "${hook.url}". This points to an issue with the library or the URL string itself.`);
} else {
    console.log("SUCCESS (with hardcode): Webhook URL appears to be set correctly in the hook object!");
}
// --- END MODIFIED WEBHOOK INITIALIZATION ---

const CHECK_INTERVAL = process.env.CHECK_INTERVAL || '0 */4 * * *';
const PROPERTY_URL = 'https://www.unitestudents.com/student-accommodation/medway/pier-quays';

const NAVIGATION_TIMEOUT = 75000; 
const PAGE_TIMEOUT = 100000;    

const DUMP_CONTRACT_SECTION_HTML_FOR_DEBUG = process.env.DEBUG_HTML_DUMP === 'true' || true; 

async function sendDiscordMessage(content) {
  if (hook.url === placeholderUrl || !hook.url || !hook.url.startsWith('https://discord.com/api/webhooks/')) {
    console.warn(`Discord webhook URL appears invalid or is a placeholder in sendDiscordMessage. Current hook.url: "${hook.url}". Skipping notification.`);
    return;
  }
  try {
    const embed = new MessageBuilder()
      .setTitle(content.title)
      .setDescription(content.description.substring(0, 4090)) 
      .setColor(content.color)
      .setFooter(`Checked at ${new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' })}`)
      .setURL(content.url || PROPERTY_URL)
      .setTimestamp();
    if (content.fields) content.fields.forEach(field => embed.addField(field.name, String(field.value).substring(0,1020), field.inline));
    await hook.send(embed);
    console.log('Discord notification sent successfully');
  } catch (error) {
    console.error(`Failed to send Discord notification. Title: ${content.title}. Error:`, error.message, error.stack ? error.stack.substring(0,500) : '');
    // Avoid sending another message if the webhook itself is the problem.
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
  if (textContent) { /* ... (textContent click logic) ... */ }
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
      args: [ /* ... (browser args) ... */ ],
      protocolTimeout: 180000 
    });
    
    page = await browser.newPage();
    /* ... (viewport, useragent, timeouts, request interception setup) ... */
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
    
    try { /* ... (cookie consent) ... */ } catch (e) { console.log('Minor error during cookie consent:', e.message); }
    
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
            console.log("DEBUG: Page HTML snapshot (first 3KB):", pageContentSnapshot.substring(0,3000));
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
    if (!await waitForSelectorWithTimeout(page, 'span ::-p-text(Reserve your room)', 30000)) { /* ... */ }
    await page.waitForTimeout(3000); 

    console.log(`On page for contract extraction: ${await page.title()} | URL: ${await page.url()}`);

    if (DUMP_CONTRACT_SECTION_HTML_FOR_DEBUG) { /* ... (HTML dump logic) ... */ }
    
    console.log('Extracting contract information...');
    const contracts = await page.evaluate(() => { /* ... (contract extraction logic) ... */ });
    
    console.log('Extracted contracts:', JSON.stringify(contracts, null, 2));
    
    if (!contracts || contracts.length === 0) { /* ... (No details found message) ... */ } 
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

// --- Health check and scheduling (unchanged) ---
if (process.env.ENABLE_HEALTH_CHECK === 'true') { /* ... */ }
cron.schedule(CHECK_INTERVAL, checkForContracts, { scheduled: true, timezone: 'Europe/London' });

// --- Startup Logic (unchanged) ---
if (DUMP_CONTRACT_SECTION_HTML_FOR_DEBUG) { /* ... */ } 
else { /* ... */ }

process.on('SIGINT', () => { console.log('Bot shutting down...'); process.exit(0); });
process.on('uncaughtException', (err) => { console.error('Uncaught global exception:', err.message, err.stack); });
