// Unite Students Contract Checker Bot - vNext Attempt 15.11
// ULTRA BASIC TEST: No Puppeteer. Only node-fetch.

console.log("<<<<< SCRIPT VERSION 15.11 IS RUNNING - TOP OF FILE (NO PUPPETEER TEST) >>>>>"); 

const cron = require('node-cron');
const fetch = require('node-fetch'); 
console.log("LOG POINT A: fetch and cron required.");

const dotenv = require('dotenv');
dotenv.config(); 
console.log("LOG POINT B: dotenv.config() processed.");

const DISCORD_WEBHOOK_URL_FROM_ENV = process.env.DISCORD_WEBHOOK_URL; 
console.log("DISCORD_WEBHOOK_URL_FROM_ENV:", DISCORD_WEBHOOK_URL_FROM_ENV);

const CHECK_INTERVAL = process.env.CHECK_INTERVAL || '0 */4 * * *';
const PROPERTY_URL = 'https://www.unitestudents.com/student-accommodation/medway/pier-quays';
console.log("LOG POINT C: Basic constants set.");

async function sendDiscordMessage(content) {
  const webhookUrl = DISCORD_WEBHOOK_URL_FROM_ENV;
  if (!webhookUrl || !webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
    console.warn(`Discord webhook URL invalid: "${webhookUrl}". Skipping.`);
    return;
  }
  const payload = { username: "Unite Alert (Basic Test)", embeds: [{ ...content, timestamp: new Date().toISOString() }] };
  try {
    const response = await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!response.ok) console.error(`Fetch Discord Error: ${response.status} ${response.statusText}`, await response.text());
    else console.log('Fetch Discord success.');
  } catch (error) { console.error('Fetch Discord Exception:', error.message); }
}
console.log("LOG POINT D: sendDiscordMessage defined.");

async function runSimpleCheck() {
  console.log("<<<<< RUNSIMPLECHECK FUNCTION ENTERED (v15.11) >>>>>");
  try {
    console.log("Attempting direct fetch of Google (basic network test)...");
    const googleResponse = await fetch('https://www.google.com', { timeout: 15000 });
    console.log(`Google fetch status: ${googleResponse.status}`);
    await sendDiscordMessage({ title: "Simple Test - Google Fetch", description: `Status: ${googleResponse.status}`, color: googleResponse.ok ? 0x00FF00 : 0xFF0000 });

    console.log(`Attempting direct fetch of PROPERTY_URL: ${PROPERTY_URL}...`);
    const uniteResponse = await fetch(PROPERTY_URL, { 
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' },
        timeout: 45000 
    });
    console.log(`Unite Property URL fetch status: ${uniteResponse.status}`);
    const uniteHtml = await uniteResponse.text();
    const uniteHtmlContainsBody = uniteHtml.toLowerCase().includes("<body");
    console.log(`Unite HTML (first 1KB): ${uniteHtml.substring(0,1024)}`);
    console.log(`Unite HTML contains <body>: ${uniteHtmlContainsBody}`);

    await sendDiscordMessage({ 
        title: "Simple Test - Unite Property Fetch", 
        description: `Status: ${uniteResponse.status}\nContains <body>: ${uniteHtmlContainsBody}\nHTML (start):\n\`\`\`html\n${uniteHtml.substring(0,1800)}\n\`\`\``, 
        color: uniteResponse.ok && uniteHtmlContainsBody ? 0x00FF00 : 0xFF8C00 
    });

    if (uniteResponse.ok && uniteHtmlContainsBody) {
      console.log("Simple check: Unite property page fetched successfully with a body tag using node-fetch.");
    } else {
      console.error("Simple check: Failed to fetch Unite property page correctly with node-fetch.");
    }

  } catch (error) {
    console.error('<<<<< RUNSIMPLECHECK: ERROR CAUGHT >>>>>');
    console.error('Error during simple check:', error.message, error.stack ? error.stack.substring(0,1000) : 'No stack'); 
    await sendDiscordMessage({ title: '❌ Simple Test Error', description: `\`\`\`${error.message}\n${error.stack ? error.stack.substring(0,1000) : ''}\`\`\``, color: 0xFF0000 });
  } finally {
    console.log("<<<<< RUNSIMPLECHECK FUNCTION EXITED >>>>>");
  }
}
console.log("LOG POINT E: runSimpleCheck defined.");

// --- Startup Logic ---
console.log("LOG POINT F: Before Startup Logic.");
(async () => {
    console.log("<<<<< SCRIPT VERSION 15.11 - ASYNC IIFE ENTERED (Simple Check) >>>>>"); 
    try {
        console.log("<<<<< SCRIPT VERSION 15.11 - runSimpleCheck INVOKING NOW... >>>>>");
        await runSimpleCheck();
        console.log("<<<<< SCRIPT VERSION 15.11 - runSimpleCheck CALL COMPLETED >>>>>");
    } catch (iifeError) {
        console.error("<<<<< SCRIPT VERSION 15.11 - ERROR IN STARTUP ASYNC IIFE >>>>>", iifeError.message, iifeError.stack);
        await sendDiscordMessage({
            title: "❌ CRITICAL STARTUP ERROR (IIFE - Simple Check)",
            description: `The main async startup function failed: ${iifeError.message}`, color: 0xFF0000
        });
    }
    console.log("Simple check run complete (after IIFE).");
})();
console.log("LOG POINT G: After Startup Logic initiated.");

process.on('SIGINT', () => { console.log('Bot shutting down (Simple Check)...'); process.exit(0); });
process.on('uncaughtException', (err) => { 
    console.error('<<<<< UNCAUGHT GLOBAL EXCEPTION (Simple Check) >>>>>');
    console.error(err.message, err.stack); 
    sendDiscordMessage({ title: "❌ CRITICAL - UNCAUGHT EXCEPTION (Simple Check)", description: `Exception: ${err.message}`, color: 0xFF0000 })
        .catch(e => console.error("Failed to send Discord for uncaught exception:", e));
});
console.log("LOG POINT H: Event listeners set up. Script fully parsed (Simple Check).");
console.log("<<<<< SCRIPT VERSION 15.11 HAS FINISHED PARSING - BOTTOM OF FILE (NO PUPPETEER TEST) >>>>>");
