// Unite Students Contract Checker Bot - vNext Attempt 13
// Immediate HTML dump after Ensuite click to diagnose missing contract section.

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

// DUMP_CONTRACT_SECTION_HTML_FOR_DEBUG will now control the new immediate dump after Ensuite click
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
  console.log(`[${new Date().toISOString()}] Running contract check...`);
  let browser = null;
  let page = null;
  
  try {
    console.log('Launching browser...');
    browser = await puppeteer.launch({ /* ... (launch options unchanged) ... */ });
    page = await browser.newPage();
    /* ... (viewport, useragent, timeouts, request interception - unchanged) ... */

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
        // ... (debug info gathering and throw error - same as v11/v12) ...
        throw new Error("No room type buttons (e.g., [data-room_type]) found/visible. Check Discord for page state dump details.");
    }
    console.log('General room type buttons interface appears to be ready.');

    const ensuiteSuccess = await enhancedClick(page, 
        ['button[data-room_type="ENSUITE"]', 'button[aria-label="Select ENSUITE"]', 'button[aria-label*="En-suite" i]', 'div[role="button"][aria-label*="En-suite" i]'], 
        'En-suite', 'Ensuite option'
    );
    if (!ensuiteSuccess) throw new Error('Could not click "Ensuite" option using enhancedClick.');
    
    // ---- IMMEDIATE HTML DUMP of div.mt-9 (or whole page if not found) ----
    console.log("Successfully clicked 'Ensuite'. Waiting a fixed 5 seconds for content to potentially load...");
    await page.waitForTimeout(5000); 

    const urlAfterEnsuite = await page.url();
    const titleAfterEnsuite = await page.title();
    console.log(`State after Ensuite click & 5s wait: URL: ${urlAfterEnsuite}, Title: ${titleAfterEnsuite}`);

    if (DUMP_HTML_AFTER_ENSUITE_CLICK) { // Changed variable name for clarity
        console.log("---- DEBUG: Attempting IMMEDIATE HTML dump after Ensuite click (targeting div.mt-9) ----");
        await sendDiscordMessage({ title: "DEBUG - Post-Ensuite Click HTML Dump", description: `Attempting to grab HTML of 'div.mt-9'. URL: ${urlAfterEnsuite}`, color: 0xFFFF00 });
        
        const dumpTargetSelector = 'div.mt-9'; 
        let sectionHTML = '';
        try {
            // Try to get HTML of div.mt-9 without a long wait, just see if it's there
            sectionHTML = await page.evaluate((selectorToDump) => {
                const targetElement = document.querySelector(selectorToDump);
                if (targetElement) {
                    return targetElement.outerHTML;
                }
                return null; // Return null if not found immediately
            }, dumpTargetSelector);

            if (sectionHTML) {
                console.log(`---- HTML DUMP FOR "${dumpTargetSelector}" (first 15KB for console) ----\n`, String(sectionHTML).substring(0, 15000), "\n---- END HTML DUMP ----");
            } else {
                console.log(`"${dumpTargetSelector}" not immediately found after Ensuite click. Dumping whole page content instead.`);
                sectionHTML = await page.content(); // Get full page HTML
                await sendDiscordMessage({ title: `DEBUG - ${dumpTargetSelector} NOT FOUND (Post-Ensuite)`, description: `Selector "${dumpTargetSelector}" was not found immediately after Ensuite click. Sending full page HTML instead. URL: ${urlAfterEnsuite}`, color: 0xFF8C00 });
            }
            
            const htmlToDiscord = String(sectionHTML); 
            const chunks = [];
            const chunkSize = 1900; // Max length for Discord embed description part
            for (let i = 0; i < htmlToDiscord.length; i += chunkSize) { 
                chunks.push(htmlToDiscord.substring(i, i + chunkSize)); 
            }
            if (chunks.length === 0 && htmlToDiscord.length > 0) chunks.push(htmlToDiscord); 
            else if (chunks.length === 0) chunks.push("No HTML content found or target element was null for dump.");

            for (const chunk of chunks) {
                await sendDiscordMessage({ title: `DEBUG Post-Ensuite HTML (${sectionHTML && sectionHTML.startsWith('<div') ? dumpTargetSelector : 'Full Page'})`, description: `\`\`\`html\n${chunk}\n\`\`\``, color: 0x0000FF });
                await page.waitForTimeout(500); 
            }
        } catch (htmlDumpError) {
            console.log(`Error trying to get HTML for debug after Ensuite: `, htmlDumpError.message, htmlDumpError.stack);
            await sendDiscordMessage({ title: "DEBUG HTML DUMP FAILED (Post-Ensuite)", description: `Error: ${htmlDumpError.message}`, color: 0xFF0000 });
        }
    }
    // ---- END IMMEDIATE HTML DUMP ----

    console.log('Now attempting to wait for "Reserve your room" span before contract extraction...');
    if (!await waitForSelectorWithTimeout(page, 'span ::-p-text(Reserve your room)', 20000)) { 
        console.warn("'Reserve your room' span not found even after Ensuite click and HTML dump. Contract extraction will likely fail or find nothing.");
        // Don't throw, let contract extraction try, it has its own error reporting / empty result handling
    } else {
        console.log("'Reserve your room' span found after HTML dump attempt.");
    }
    await page.waitForTimeout(1000); // Minimal pause

    console.log(`Current page state for contract extraction: ${await page.title()} | URL: ${await page.url()}`);
    
    console.log('Extracting contract information...');
    const contractsData = await page.evaluate(() => { /* ... (contract extraction logic - same as v9/v10) ... */ });

    let contracts; /* ... (processing contractsData - same as v9/v10) ... */
    
    console.log('Final contracts variable:', JSON.stringify(contracts, null, 2));
    
    if (!contracts || contracts.length === 0) { /* ... (No details found message - same as v9/v10) ... */ } 
    else { /* ... (Process new contracts / standard only message - same as v9/v10) ... */ }
    
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

// --- Health check and scheduling --- (unchanged)
// --- Startup Logic --- (DUMP_HTML_AFTER_ENSUITE_CLICK controls it)
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
