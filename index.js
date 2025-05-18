// Unite Students Contract Checker Bot - vNext Attempt 15.14
// Test 1: Super Simple IIFE at startup. checkForContracts is NOT called by IIFE.
// SCRIPT VERSION 15.14 log is present.

console.log("<<<<< SCRIPT VERSION 15.14 IS RUNNING - TOP OF FILE (Super Simple IIFE Test) >>>>>"); 

// --- ENV VAR CHECK AT THE VERY TOP ---
console.log("--- INIT: ENV VAR CHECK (RAW) ---"); 
console.log("Raw process.env.DISCORD_WEBHOOK_URL:", process.env.DISCORD_WEBHOOK_URL);
console.log("Typeof raw process.env.DISCORD_WEBHOOK_URL:", typeof process.env.DISCORD_WEBHOOK_URL);
console.log("--- END INIT: ENV VAR CHECK (RAW) ---");

const puppeteer = require('puppeteer-extra'); // Still required, but not used by startup IIFE
const StealthPlugin = require('puppeteer-extra-plugin-stealth'); // Still required
puppeteer.use(StealthPlugin());
const cron = require('node-cron'); // Still required for cron scheduling
const fetch = require('node-fetch'); 
console.log("LOG POINT 0: Core modules required.");

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
console.log("LOG POINT 4: After TIMEOUT consts.");

// DUMP_HTML_AFTER_ENSUITE_CLICK is only relevant if checkForContracts runs
const DUMP_HTML_AFTER_ENSUITE_CLICK = process.env.DEBUG_HTML_DUMP === 'true' || true; 
console.log("LOG POINT 5: After DUMP_HTML const. DUMP_HTML_AFTER_ENSUITE_CLICK is:", DUMP_HTML_AFTER_ENSUITE_CLICK);

async function sendDiscordMessage(content) { /* ... (same as v15.13 - using fetch) ... */ }
console.log("LOG POINT 6: After sendDiscordMessage function definition.");

async function waitForSelectorWithTimeout(page, selector, timeout = 10000) { /* ... (unchanged) ... */ }
console.log("LOG POINT 7: After waitForSelectorWithTimeout function definition");

async function enhancedClick(page, selectors, textContent, description = "element") { /* ... (unchanged) ... */ }
console.log("LOG POINT 8: After enhancedClick function definition");

async function checkForContracts() {
  // This function WILL NOT BE CALLED by the startup IIFE in this version (15.14)
  // It would only be called by cron if the process stays alive long enough.
  console.log("<<<<< CHECKFORCONTRACTS FUNCTION ENTERED (v15.14 - IF CALLED BY CRON) >>>>>");
  // ... (The rest of checkForContracts logic remains here but is dormant for the initial test)
}
console.log("LOG POINT 9: After checkForContracts function definition");

// --- Health check and scheduling ---
// Health check might not be reachable if IIFE test fails and exits process
if (process.env.ENABLE_HEALTH_CHECK === 'true') { 
  console.log("LOG POINT 10: Setting up Health Check");
  // ... (http server setup)
}
console.log("LOG POINT 11: After Health Check setup (or skip if not enabled).");

// Cron will still be scheduled, but its first tick is hours away.
cron.schedule(CHECK_INTERVAL, checkForContracts, { scheduled: true, timezone: 'Europe/London' });
console.log("LOG POINT 12: After cron.schedule.");


// --- Startup Logic (MODIFIED FOR SUPER SIMPLE IIFE TEST) ---
console.log("LOG POINT 13: Before Startup Logic.");

// The DUMP_HTML_AFTER_ENSUITE_CLICK flag is usually for inside checkForContracts.
// For this test, we just want to see if the IIFE runs.
// We'll use a simple flag to indicate we expect the IIFE to run once.
const RUN_STARTUP_IIFE_TEST = true; 

if (RUN_STARTUP_IIFE_TEST) { 
    console.log("SUPER SIMPLE IIFE TEST MODE IS ON - preparing for simple IIFE test.");
    (async () => {
        console.log("<<<<< SCRIPT VERSION 15.14 - SUPER SIMPLE ASYNC IIFE ENTERED >>>>>");
        try {
            await new Promise(resolve => setTimeout(resolve, 200)); // Tiny async wait (200ms)
            console.log("<<<<< SCRIPT VERSION 15.14 - SUPER SIMPLE ASYNC IIFE - Wait complete >>>>>");
            await sendDiscordMessage({ // Test if Discord message can be sent from here
                title: "✅ Super Simple IIFE Test Successful (v15.14)",
                description: "The basic async IIFE structure ran and this message was sent.",
                color: 0x00FF00 // Green
            });
            console.log("<<<<< SCRIPT VERSION 15.14 - SUPER SIMPLE ASYNC IIFE - Discord message attempt finished >>>>>");
        } catch (iifeError) {
            console.error("<<<<< SCRIPT VERSION 15.14 - ERROR IN SUPER SIMPLE ASYNC IIFE >>>>>", iifeError.message, iifeError.stack);
            // Attempt to send Discord message about this failure
            try {
                await sendDiscordMessage({
                    title: "❌ CRITICAL ERROR IN SUPER SIMPLE IIFE (v15.14)",
                    description: `The simple async startup function failed: ${iifeError.message}\nStack: ${iifeError.stack ? iifeError.stack.substring(0,1000) : 'No stack'}`,
                    color: 0xFF0000
                });
            } catch (discordFailError) {
                console.error("Failed to send Discord error message from IIFE catch:", discordFailError.message);
            }
        }
        console.log("<<<<< SCRIPT VERSION 15.14 - SUPER SIMPLE ASYNC IIFE COMPLETED >>>>>");
    })();
    console.log("<<<<< SCRIPT VERSION 15.14 - AFTER SUPER SIMPLE IIFE IS KICKED OFF >>>>>");
} else { 
    // This 'else' block would contain the normal startup logic with checkForContracts
    // For now, it's bypassed to test the IIFE stability.
    console.log("Normal startup logic (calling checkForContracts) is currently bypassed for IIFE test.");
}
console.log("LOG POINT 14: After Startup Logic section.");

process.on('SIGINT', () => { console.log('Bot shutting down (v15.14)...'); process.exit(0); });
process.on('uncaughtException', (err) => { 
    console.error('<<<<< UNCAUGHT GLOBAL EXCEPTION (v15.14) >>>>>');
    console.error(err.message, err.stack); 
    sendDiscordMessage({
        title: "❌ CRITICAL - UNCAUGHT EXCEPTION (v15.14)",
        description: `Exception: ${err.message}\nStack: ${err.stack ? err.stack.substring(0,1000) : 'No stack'}`,
        color: 0xFF0000
    }).catch(e => console.error("Failed to send Discord message for uncaught exception:", e));
});
console.log("LOG POINT 15: Event listeners set up. Script fully parsed (v15.14).");
console.log("<<<<< SCRIPT VERSION 15.14 HAS FINISHED PARSING - BOTTOM OF FILE >>>>>");
