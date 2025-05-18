// Unite Students Contract Checker Bot - vNext Attempt 15.15
// Hyper-detailed logging in sendDiscordMessage and the startup IIFE.
// SCRIPT VERSION 15.15 log is present.

console.log("<<<<< SCRIPT VERSION 15.15 IS RUNNING - TOP OF FILE (Hyper-Logging IIFE Test) >>>>>"); 

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
console.log("LOG POINT 0: Core modules required.");

const dotenv = require('dotenv');
dotenv.config(); 
console.log("LOG POINT 0.5: dotenv.config() processed.");

const DISCORD_WEBHOOK_URL_FROM_ENV = process.env.DISCORD_WEBHOOK_URL; 
console.log("DISCORD_WEBHOOK_URL_FROM_ENV (to be used by fetch):", DISCORD_WEBHOOK_URL_FROM_ENV);
console.log("Typeof DISCORD_WEBHOOK_URL_FROM_ENV:", typeof DISCORD_WEBHOOK_URL_FROM_ENV); // Added type check here too
console.log("LOG POINT 1: Before CHECK_INTERVAL declaration");

const CHECK_INTERVAL = process.env.CHECK_INTERVAL || '0 */4 * * *';
console.log("LOG POINT 2: After CHECK_INTERVAL, before PROPERTY_URL");
const PROPERTY_URL = 'https://www.unitestudents.com/student-accommodation/medway/pier-quays';
console.log("LOG POINT 3: After PROPERTY_URL");

const INITIAL_GOTO_TIMEOUT = 60000; 
const NAVIGATION_TIMEOUT = 120000; 
const PAGE_TIMEOUT = 150000;    
console.log("LOG POINT 4: After TIMEOUT consts.");

const DUMP_HTML_AFTER_ENSUITE_CLICK = process.env.DEBUG_HTML_DUMP === 'true' || true; 
console.log("LOG POINT 5: After DUMP_HTML const. DUMP_HTML_AFTER_ENSUITE_CLICK is:", DUMP_HTML_AFTER_ENSUITE_CLICK);

async function sendDiscordMessage(content) {
  console.log(`<<<< SENDDISCORDMESSAGE (v15.15): Entered function. Title: "${content.title}" >>>>`);
  const webhookUrl = DISCORD_WEBHOOK_URL_FROM_ENV; // Uses the global const
  console.log(`<<<< SENDDISCORDMESSAGE: webhookUrl variable is: "${webhookUrl}", Type: ${typeof webhookUrl} >>>>`);

  if (!webhookUrl || typeof webhookUrl !== 'string' || !webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
    console.warn(`<<<< SENDDISCORDMESSAGE: Webhook URL invalid or placeholder. URL: "${webhookUrl}". Type: ${typeof webhookUrl}. Skipping. >>>>`);
    return;
  }

  const payload = {
    username: "Unite Students Alert (v15.15)", 
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
    console.log(`<<<< SENDDISCORDMESSAGE: About to call fetch. URL (obfuscated end): ${webhookUrl.substring(0, webhookUrl.lastIndexOf('/'))}/... >>>>`);
    const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        timeout: 15000 // Add a timeout to fetch itself
    });
    console.log(`<<<< SENDDISCORDMESSAGE: Fetch call completed. Response status: ${response.status} >>>>`);
    if (!response.ok) {
        console.error(`<<<< SENDDISCORDMESSAGE: Fetch Error: ${response.status} ${response.statusText} >>>>`);
        const responseBody = await response.text();
        console.error("<<<< SENDDISCORDMESSAGE: Fetch Error Response body (start):", responseBody.substring(0, 500), ">>>>"); 
    } else {
        console.log('<<<< SENDDISCORDMESSAGE: Fetch Discord notification sent successfully. >>>>');
    }
  } catch (error) {
      console.error('<<<< SENDDISCORDMESSAGE: FETCH EXCEPTION CAUGHT >>>>');
      console.error('Fetch Exception details:', error.message, error.stack ? error.stack.substring(0,500) : '');
  }
  console.log(`<<<< SENDDISCORDMESSAGE: Exiting function. Title: "${content.title}" >>>>`);
}
console.log("LOG POINT 6: After sendDiscordMessage function definition.");

async function waitForSelectorWithTimeout(page, selector, timeout = 10000) { /* ... (unchanged) ... */ }
console.log("LOG POINT 7: After waitForSelectorWithTimeout function definition");

async function enhancedClick(page, selectors, textContent, description = "element") { /* ... (unchanged) ... */ }
console.log("LOG POINT 8: After enhancedClick function definition");

async function checkForContracts() {
  // This function WILL NOT BE CALLED by the startup IIFE in this version (15.15)
  console.log("<<<<< CHECKFORCONTRACTS FUNCTION ENTERED (v15.15 - IF CALLED BY CRON) >>>>>");
  // ... (The rest of checkForContracts logic remains here but is dormant for the initial test)
}
console.log("LOG POINT 9: After checkForContracts function definition");

// --- Health check and scheduling ---
if (process.env.ENABLE_HEALTH_CHECK === 'true') { /* ... */ }
console.log("LOG POINT 11: After Health Check setup (or skip if not enabled).");
cron.schedule(CHECK_INTERVAL, checkForContracts, { scheduled: true, timezone: 'Europe/London' });
console.log("LOG POINT 12: After cron.schedule.");

// --- Startup Logic (MODIFIED FOR HYPER-LOGGING IIFE TEST) ---
console.log("LOG POINT 13: Before Startup Logic.");
const RUN_STARTUP_IIFE_TEST = true; 

if (RUN_STARTUP_IIFE_TEST) { 
    console.log("HYPER-LOGGING IIFE TEST MODE IS ON - preparing for simple IIFE test.");
    (async () => {
        console.log("<<<<< SCRIPT v15.15 - ASYNC IIFE: Entered. >>>>>");
        try {
            console.log("<<<<< SCRIPT v15.15 - IIFE: Before tiny promise wait (200ms). >>>>>");
            await new Promise(resolve => setTimeout(resolve, 200)); 
            console.log("<<<<< SCRIPT v15.15 - IIFE: Tiny promise wait complete. >>>>>");
            
            console.log("<<<<< SCRIPT v15.15 - IIFE: Attempting to send Discord message NOW... >>>>>");
            await sendDiscordMessage({ 
                title: "✅ IIFE Test Message (v15.15)",
                description: "This message confirms the startup IIFE ran, awaited a promise, and called sendDiscordMessage.",
                color: 0x00FF00 // Green
            });
            console.log("<<<<< SCRIPT v15.15 - IIFE: Call to sendDiscordMessage has returned/completed. >>>>>");
        } catch (iifeError) {
            console.error("<<<<< SCRIPT v15.15 - IIFE: ERROR CAUGHT IN IIFE TRY-CATCH >>>>>");
            console.error("IIFE Error details:", iifeError.message, iifeError.stack ? iifeError.stack.substring(0,1000) : "No stack in IIFE error");
            try {
                await sendDiscordMessage({
                    title: "❌ CRITICAL ERROR IN STARTUP IIFE (v15.15)",
                    description: `The simple async startup function failed: ${iifeError.message}\nStack: ${iifeError.stack ? iifeError.stack.substring(0,1000) : 'No stack'}`,
                    color: 0xFF0000
                });
            } catch (discordFailError) {
                console.error("Failed to send Discord error message from IIFE catch:", discordFailError.message);
            }
        }
        console.log("<<<<< SCRIPT v15.15 - ASYNC IIFE: Completed (end of try/catch block). >>>>>");
    })();
    console.log("<<<<< SCRIPT v15.15 - AFTER ASYNC IIFE IS KICKED OFF (IIFE runs in background). >>>>>");
} else { 
    console.log("Normal startup logic (calling checkForContracts) is currently bypassed for IIFE test.");
}
console.log("LOG POINT 14: After Startup Logic section.");

process.on('SIGINT', () => { console.log('Bot shutting down (v15.15)...'); process.exit(0); });
process.on('uncaughtException', (err) => { /* ... (same as v15.14) ... */ });
console.log("LOG POINT 15: Event listeners set up. Script fully parsed (v15.15).");
console.log("<<<<< SCRIPT VERSION 15.15 HAS FINISHED PARSING - BOTTOM OF FILE >>>>>");
