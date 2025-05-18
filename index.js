// Optimized Unite Students Contract Checker Bot for Railway
// This version has improved stability on resource-constrained environments
// Includes enhanced debugging v4: DUMP_HTML var check, minimal evaluate test during long wait

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const minimalStealth = StealthPlugin();

minimalStealth.enabledEvasions.delete('sourceurl');
minimalStealth.enabledEvasions.delete('media.codecs');
minimalStealth.enabledEvasions.delete('navigator.plugins');
puppeteer.use(minimalStealth);

const cron = require('node-cron');
const fetch = require('node-fetch');
const dotenv = require('dotenv');
dotenv.config();

console.log("Unite Students Bot Starting - Railway Optimized Version (with enhanced debug v4 - Full)");

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const CHECK_INTERVAL = process.env.CHECK_INTERVAL || '0 */4 * * *';
const PROPERTY_URL = 'https://www.unitestudents.com/student-accommodation/medway/pier-quays';

const INITIAL_GOTO_TIMEOUT = 90000;
const NAVIGATION_TIMEOUT = 180000;
const PAGE_TIMEOUT = 240000;
const PROTOCOL_TIMEOUT = 300000; 

const DUMP_HTML = process.env.DEBUG_HTML_DUMP === 'true';
console.log(`DEBUG: Initialized DUMP_HTML variable. Value: ${DUMP_HTML}. (Raw from process.env.DEBUG_HTML_DUMP: "${process.env.DEBUG_HTML_DUMP}")`);

async function sendDiscordMessage(content) {
  if (!DISCORD_WEBHOOK_URL || !DISCORD_WEBHOOK_URL.startsWith('https://discord.com/api/webhooks/')) {
    console.warn(`Invalid webhook URL. Skipping notification. URL: "${DISCORD_WEBHOOK_URL}"`);
    return;
  }
  const payload = {
    username: "Unite Students Alert (Optimized v4)",
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
    payload.embeds[0].fields = content.fields.map(f => ({ name: String(f.name).substring(0, 256), value: String(f.value).substring(0, 1024), inline: f.inline || false }));
  }
  try {
    const response = await fetch(DISCORD_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), timeout: 20000 });
    if (!response.ok) {
      const responseBody = await response.text();
      console.error(`Error sending Discord message: ${response.status} ${response.statusText}. Body: ${responseBody.substring(0, 500)}`);
    } else { /* console.log('Discord notification sent successfully'); */ }
  } catch (error) {
    console.error('Exception sending Discord notification:', error.message, error.stack ? error.stack.substring(0,300) : "");
  }
}

async function waitForSelector(page, selector, timeout = 15000) {
  try {
    await page.waitForSelector(selector, { visible: true, timeout });
    return true;
  } catch (error) {
    return false;
  }
}

async function clickElement(page, selectors, textContent, description = "element") {
  for (const selector of Array.isArray(selectors) ? selectors : [selectors]) {
    try {
      console.log(`Trying to click ${description} with selector: ${selector}`);
      if (await waitForSelector(page, selector, 12000)) {
        await page.click(selector); console.log(`Clicked ${description} using: ${selector}`);
        await page.waitForTimeout(3000); return true;
      } else { console.log(`Selector "${selector}" for ${description} not found/visible for clickElement.`); }
    } catch (e) { console.log(`Failed to click ${description} with selector "${selector}": ${e.message.split('\n')[0]}`); }
  }
  if (textContent) {
    try {
      console.log(`Trying to click ${description} by text content: "${textContent}"`);
      const textSelectorPuppeteer = `::-p-text(${textContent})`;
      try {
        if (await waitForSelector(page, textSelectorPuppeteer, 8000)) {
          await page.click(textSelectorPuppeteer); console.log(`Clicked ${description} using Puppeteer's text selector: "${textContent}"`);
          await page.waitForTimeout(3000); return true;
        }
      } catch (textSelError) { console.log(`Puppeteer text selector failed for "${textContent}", trying evaluate. Error: ${textSelError.message.split('\n')[0]}`); }
      const clicked = await page.evaluate((text) => {
        const elements = Array.from(document.querySelectorAll('button, a, div[role="button"], span[role="button"], [class*="button"]'));
        const targetElement = elements.find(el => el.textContent.trim().toLowerCase().includes(text.toLowerCase()));
        if (targetElement) {
          const rect = targetElement.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0 && getComputedStyle(targetElement).visibility !== 'hidden' && getComputedStyle(targetElement).display !== 'none' && targetElement.offsetParent !== null) {
            targetElement.click(); return true;
          }
        } return false;
      }, textContent);
      if (clicked) {
        console.log(`Clicked ${description} by text content using page.evaluate`);
        await page.waitForTimeout(3000); return true;
      }
    } catch (e) { console.log(`Failed to click ${description} by text content in clickElement: ${e.message.split('\n')[0]}`); }
  }
  console.log(`Could not click ${description} using any provided method.`);
  return false;
}

async function checkForContracts() {
  console.log(`[${new Date().toISOString()}] Running contract check...`);
  let browser = null;
  let page = null;
  let isBrowserResponsive = true;

  try {
    console.log(`Testing site reachability...`);
    try {
      const testResponse = await fetch(PROPERTY_URL, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36' }, timeout: 30000 });
      console.log(`Site direct fetch status: ${testResponse.status}`);
      if (!testResponse.ok) console.warn(`Site direct fetch returned non-OK status: ${testResponse.status}`);
    } catch (fetchError) {
      console.error(`Site fetch test failed: ${fetchError.message}`);
      await sendDiscordMessage({ title: "❌ Site Connectivity Issue", description: `Failed to reach ${PROPERTY_URL}: ${fetchError.message}`, color: 0xFF0000 });
    }

    console.log('Launching browser...');
    browser = await puppeteer.launch({
      headless: true, executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable',
      args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-accelerated-2d-canvas','--no-first-run','--no-zygote','--disable-gpu','--window-size=1366,768'],
      protocolTimeout: PROTOCOL_TIMEOUT
    });
    page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT);
    page.setDefaultTimeout(PAGE_TIMEOUT);

    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const url = request.url().toLowerCase(); const resourceType = request.resourceType();
      const trackerKeywords = ['analytics', 'google-analytics', 'googletagmanager', 'facebook', 'fbcdn', 'hotjar', 'bingads', 'bat.bing', 'scorecardresearch', 'doubleclick'];
      const isTracker = trackerKeywords.some(keyword => url.includes(keyword));
      if (isTracker && ['script', 'xhr', 'fetch', 'image', 'document', 'stylesheet', 'beacon'].includes(resourceType)) { request.abort('blockedbyclient').catch(() => {}); }
      else { request.continue().catch(() => {}); }
    });

    console.log(`Navigating to property page with waitUntil: domcontentloaded...`);
    await page.goto(PROPERTY_URL, { timeout: INITIAL_GOTO_TIMEOUT, waitUntil: ['domcontentloaded'] });
    console.log('Page navigation complete. URL:', await page.url());

    console.log('DEBUG: Entering cookie consent block...');
    try {
      const cookieSelector = '[id*="onetrust-accept-btn-handler"], button[id*="accept"], button[data-testid*="accept"], button[aria-label*="accept all cookies" i], button[class*="accept" i][class*="cookie" i]';
      const cookieFound = await waitForSelector(page, cookieSelector, 7000);
      console.log(`DEBUG: waitForSelector for cookie returned: ${cookieFound}`);
      if (cookieFound) {
        console.log('DEBUG: Cookie selector found, attempting click...');
        await page.click(cookieSelector); console.log('Cookie consent handled (clicked).');
        await page.waitForTimeout(2000);
      } else { console.log('DEBUG: Cookie selector not found or not visible in time, skipping click.'); }
    } catch (e) { console.error('DEBUG: Error in cookie consent block:', e.message, e.stack ? e.stack.substring(0, 400) : ''); }
    console.log('DEBUG: Exited cookie consent block.');

    console.log('DEBUG: Starting a 30-second diagnostic static wait, will check for browser responsiveness and button presence during this...');
    let foundDuringLongWait = false;
    for (let i = 0; i < 6; i++) {
        await page.waitForTimeout(5000);
        console.log(`DEBUG: Long wait check #${i+1}`);
        try {
            const title = await page.evaluate(() => document.title);
            console.log(`DEBUG: Minimal evaluate (document.title) responsive. Title: "${title.substring(0,50)}..."`);
        } catch (evalError) {
            console.error(`DEBUG: MINIMAL page.evaluate (document.title) FAILED during long wait check #${i+1}. Error: ${evalError.message}`);
            isBrowserResponsive = false;
            if (evalError.message.includes('timed out') || evalError.message.includes('Target closed')) {
                 console.error("DEBUG: Browser seems to have crashed or connection lost. Breaking long wait.");
                 break;
            }
        }
        if (!isBrowserResponsive) break;
        console.log(`DEBUG: Looking for any button/role=button containing "Find a room" text (and visible via offsetParent)`);
        const isButtonVisible = await page.evaluate(() =>
            Boolean(Array.from(document.querySelectorAll('button, [role="button"]'))
                         .find(el => el.textContent.trim().toLowerCase().includes('find a room') &&
                                     el.offsetParent !== null &&
                                     getComputedStyle(el).visibility !== 'hidden' &&
                                     getComputedStyle(el).display !== 'none'
                              )
            )
        );
        if (isButtonVisible) {
            console.log('DEBUG: "Find a room" text found in a visible button-like element during long wait!');
            foundDuringLongWait = true;
            break;
        } else {
            console.log('DEBUG: "Find a room" text NOT found in any visible button-like element yet.');
        }
    }

    if (!isBrowserResponsive) {
        console.error("DEBUG: Browser became unresponsive during the 30s diagnostic wait. Cannot proceed reliably.");
        if (DUMP_HTML) {
            try {
                console.log("DEBUG: DUMP_HTML is true, attempting to get page content for unresponsive browser state...");
                const pageContentUnresponsive = await page.content();
                await sendDiscordMessage({
                    title: "DEBUG - Browser Unresponsive (During 30s Wait)",
                    description: `Browser became unresponsive. Last URL: ${await page.url()}\nPage HTML (first 2.5KB, if obtainable):\n\`\`\`html\n${pageContentUnresponsive.substring(0,2500)}\n\`\`\``,
                    color: 0xFF0000
                });
            } catch (dumpError) {
                 await sendDiscordMessage({
                    title: "DEBUG - Browser Unresponsive AND HTML Dump Failed",
                    description: `Browser became unresponsive. Could not get page content. Last URL: ${await page.url()}`,
                    color: 0xFF0000
                });
            }
        }
        throw new Error("Browser became unresponsive during diagnostic wait.");
    }

    if (!foundDuringLongWait) {
        console.warn('DEBUG: "Find a room" text was NOT found in any visible button-like element even after 30s. Page is likely not loading correctly or button is very different/hidden.');
        if (DUMP_HTML) {
            console.log("DEBUG: DUMP_HTML is true, attempting to get page content for Discord message (button not found after long wait)...");
            const pageContentNoButtonLongWait = await page.content();
            await sendDiscordMessage({
                title: "DEBUG - 'Find a room' Not Visible (After 30s Wait)",
                description: `The 'Find a room' button/text was not found after a 30s static wait.\nURL: ${await page.url()}\nPage HTML (first 2.5KB):\n\`\`\`html\n${pageContentNoButtonLongWait.substring(0,2500)}\n\`\`\``,
                color: 0xFF8C00
            });
        } else { console.log("DEBUG: DUMP_HTML is false, skipping HTML dump for Discord."); }
    }
    console.log('DEBUG: Finished 30-second diagnostic wait period.');

    console.log('Proceeding to click "Find a room" with clickElement function...');
    const findRoomButtonSelectors = [
        'button[data-cy="button"][data-event="book_a_room"][data-property="Pier Quays"]',
        'button[data-event="book_a_room"][data-property="Pier Quays"]',
        'button[data-cy="button"][data-event="book_a_room"]',
        'button[data-event="book_a_room"]',
        'button:has(span::-p-text(Find a room))',
        'button ::-p-text(Find a room)'
    ];
    const findRoomText = 'Find a room';
    const findRoomClicked = await clickElement(page, findRoomButtonSelectors, findRoomText, 'Find a room button');

    if (!findRoomClicked) {
      const pageContentForFindRoomDebug = DUMP_HTML ? await page.content() : "HTML dump disabled.";
      await sendDiscordMessage({
           title: "ERROR - Could Not Click 'Find a room'",
           description: `Failed to click "Find a room" even after explicit waits and long diagnostic pause. URL: ${await page.url()}\nPage HTML (start if enabled):\n\`\`\`html\n${DUMP_HTML ? pageContentForFindRoomDebug.substring(0,1800) : "HTML dump disabled."}\n\`\`\``,
           color: 0xFF0000
       });
      throw new Error('Could not click "Find a room" button');
    }

    console.log('Waiting for room selection interface (10s)...');
    await page.waitForTimeout(10000);

    console.log('Selecting Ensuite room...');
    const ensuiteSelectors = [
      'button[data-room_type="ENSUITE"]',
      'button[aria-label="Select ENSUITE"]',
      'button[id="room-option-card"] ::-p-text(En-suite)',
      'div[role="button"] ::-p-text(En-suite)'
    ];
    const ensuiteClicked = await clickElement(page, ensuiteSelectors, 'En-suite', 'Ensuite option');
    if (!ensuiteClicked) {
      const pageContentForEnsuiteDebug = DUMP_HTML ? await page.content() : "HTML dump disabled.";
      await sendDiscordMessage({
           title: "ERROR - Could Not Click 'Ensuite'",
           description: `Failed to click "Ensuite". URL: ${await page.url()}\nPage HTML (start if enabled):\n\`\`\`html\n${DUMP_HTML ? pageContentForEnsuiteDebug.substring(0,1800) : "HTML dump disabled."}\n\`\`\``,
           color: 0xFF0000 });
      throw new Error('Could not click "Ensuite" option');
    }

    console.log('Waiting for contract details to appear (10s timeout for specific element)...');
    try {
        await page.waitForSelector('span ::-p-text(Reserve your room), #pricing-option, div[role="radio"] [class*="font-bold"]', { timeout: 10000, visible: true });
        console.log("'Reserve your room' or pricing option indicator found.");
    } catch (waitErr) { console.warn("Timed out waiting for 'Reserve your room' or pricing option indicator. Contract extraction might fail or be incomplete."); }
    await page.waitForTimeout(3000);

    console.log('Extracting contract information...');
    const contracts = await page.evaluate(() => {
      try {
        const results = [];
        const reserveRoomBlock = document.querySelector('div.mt-9 div.mt-4');
        let contractElementsSource = 'Unknown';
        let contractElements;
        if (reserveRoomBlock) {
            contractElements = reserveRoomBlock.querySelectorAll('div[id="pricing-option"], div[role="radio"]');
            contractElementsSource = 'div.mt-9 div.mt-4 > div[id="pricing-option"], div[role="radio"]';
        } else {
            contractElements = Array.from(document.querySelectorAll('div[role="radiogroup"] div[role="radio"], div[data-cy*="price-option"]'));
            contractElementsSource = 'Fallback: div[role="radiogroup"] div[role="radio"], div[data-cy*="price-option"]';
            if (contractElements.length === 0) {
                contractElements = Array.from(document.querySelectorAll('div[role="radio"]'));
                contractElementsSource = 'Fallback (broad): div[role="radio"]';
            }
        }
        if (!contractElements || contractElements.length === 0) {
          return [{ error: `No contract elements found. Searched via: ${contractElementsSource}` }];
        }
        contractElements.forEach((element, index) => {
          try {
            const text = element.textContent.trim().replace(/\s\s+/g, ' ');
            let weeks = text.match(/(\d+)\s*weeks?/i)?.[1] || 'Unknown';
            let dates = text.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})\s*-\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/)?.[0] || 'Unknown dates';
            let termMatch = text.match(/(Full Year|Academic Year|Term \d|Semester \d|Short Stay|Summer Let|Full term|Academic term)/i);
            let term = termMatch ? termMatch[0] : 'Unknown term';
            if (term === 'Unknown term' && weeks !== 'Unknown') {
              const numWeeks = parseInt(weeks);
              if (numWeeks >= 38 && numWeeks <= 52) term = "Full/Academic Year (inferred)";
              else if (numWeeks >= 10 && numWeeks < 38) term = "Term/Semester (inferred)";
              else if (numWeeks < 10 && numWeeks > 0) term = "Short Term (inferred)";
            }
            let price = text.match(/£(\d+)(?:\.\d{2})?/)?.[1] || 'Unknown price';
            results.push({ source: `Element ${index+1} from ${contractElementsSource}`, weeks, dates, term, price, rawText: text.substring(0, 250) });
          } catch (innerError) {
            results.push({ error: `Error parsing individual contract element: ${innerError.message}`, rawText: element.textContent.trim().substring(0, 100) });
          }
        });
        if (results.length === 0) return [{ error: `Contract elements selected via "${contractElementsSource}", but no data extracted.` }];
        return results;
      } catch (evaluateError) {
        return [{ error: `Main page.evaluate error for contracts: ${evaluateError.message}` }];
      }
    });

    console.log('Extracted contracts:', JSON.stringify(contracts, null, 2));

    if (!contracts || contracts.length === 0 || (contracts[0] && contracts[0].error)) {
      let errorDesc = "Unable to find or parse contract details.";
      if (contracts && contracts[0] && contracts[0].error) errorDesc += `\nReason: ${contracts[0].error}`;
      if (contracts && contracts[0] && contracts[0].rawText) errorDesc += `\nRaw Text (sample): ${contracts[0].rawText}`;
      if (contracts && contracts[0] && contracts[0].source) errorDesc += `\nSource: ${contracts[0].source}`;
      const pageContentForError = DUMP_HTML ? await page.content() : "";
      await sendDiscordMessage({
        title: "⚠️ Contract Checking Issue",
        description: `${errorDesc}\nURL: ${await page.url()}${DUMP_HTML && pageContentForError ? `\nPage HTML (start):\n\`\`\`html\n${pageContentForError.substring(0,1000)}\n\`\`\`` : (DUMP_HTML ? "\n(HTML dump attempted but content was empty or failed)" : "\n(HTML dump disabled)")}`,
        color: 0xFFA500
      });
    } else {
      const nonStandardContracts = contracts.filter(c => c.weeks !== '51' && c.weeks !== 'Unknown' && !c.error && c.term && !c.term.toLowerCase().includes('full year') && parseInt(c.weeks) < 50);
      const standardContracts = contracts.filter(c => (c.weeks === '51' || (c.term && c.term.toLowerCase().includes('full year')) || parseInt(c.weeks) >= 50) && !c.error);
      if (nonStandardContracts.length > 0) {
        await sendDiscordMessage({
          title: "🎉 Alternative Contract Options Found!",
          description: `Found ${nonStandardContracts.length} non-standard (likely academic/shorter term) contracts at Pier Quays!`,
          fields: nonStandardContracts.map(c => ({ name: `${c.weeks} weeks (${c.term})`, value: `Dates: ${c.dates}\nPrice: £${c.price} per week\nRaw: ${c.rawText.substring(0,70)}...`, inline: false })),
          color: 0x00FF00, url: await page.url()
        });
      } else {
        console.log('No alternative (non-51 week / non-Full Year / <50w) contracts found this time.');
        const contractsInfo = standardContracts.length > 0 ? standardContracts.map(c => `${c.weeks}w (${c.term}) £${c.price}`).join(' | ') : "No specific contract details parsed, but no errors or alternatives.";
        if (DUMP_HTML) {
          await sendDiscordMessage({ title: "Contract Check Completed (Standard Only)", description: `Only standard contracts found: ${contractsInfo}`, color: 0x0099FF });
        }
      }
    }
  } catch (error) {
    console.error('Error during check (Outer Catch):', error.message, error.stack ? error.stack.substring(0, 1000) : '');
    let errorDescription = `Main error: ${error.message}`;
    if (page) { try { errorDescription += `\nLast URL: ${await page.url()}`; } catch { errorDescription += "\nCould not get last URL."} }
    if (DUMP_HTML && page) {
        console.log("DEBUG: Outer catch, DUMP_HTML is true. Attempting to get page content for error message...");
        try {
            const errorHtml = await page.content();
            errorDescription += `\nPage HTML (start of error state, if obtainable):\n\`\`\`html\n${errorHtml.substring(0,1500)}\n\`\`\``;
        } catch (htmlError) {
            errorDescription += `\n(Could not get page HTML at error: ${htmlError.message}. Browser might be unresponsive.)`;
            console.error("DEBUG: Failed to get HTML content in outer catch:", htmlError.message);
        }
    } else if (!DUMP_HTML) {
        errorDescription += "\n(HTML dump disabled)";
    }
    await sendDiscordMessage({ title: '❌ Bot Error (Main)', description: errorDescription.substring(0, 4000), color: 0xFF0000 });
  } finally {
    if (browser) { console.log("Closing browser..."); await browser.close(); }
    console.log('Check completed (finally block executed)');
  }
}

cron.schedule(CHECK_INTERVAL, checkForContracts, { timezone: 'Europe/London' });
const startupDelay = Math.floor(Math.random() * 7000) + 3000;
console.log(`Bot starting initial check in ${startupDelay/1000} seconds...`);
setTimeout(checkForContracts, startupDelay);

process.on('SIGINT', () => { console.log('Bot shutting down (SIGINT)...'); process.exit(0); });
process.on('SIGTERM', () => { console.log('Bot shutting down (SIGTERM)...'); process.exit(0); });
process.on('uncaughtException', (err, origin) => {
  console.error(`UNCAUGHT EXCEPTION: ${err.message}`, `Origin: ${origin}`, err.stack);
  sendDiscordMessage({ title: "❌ CRITICAL - UNCAUGHT EXCEPTION", description: `Exception: ${err.message}\nOrigin: ${origin}\nStack: ${err.stack ? err.stack.substring(0,1000) : 'No stack'}`, color: 0xFF0000 })
  .catch(e => console.error("Failed to send Discord message for uncaught exception:", e));
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
  let reasonString = typeof reason === 'object' && reason !== null ? (reason.message || JSON.stringify(reason)) : String(reason);
  sendDiscordMessage({ title: "❌ CRITICAL - UNHANDLED REJECTION", description: `Reason: ${reasonString.substring(0,1000)}\nPromise: ${String(promise).substring(0,500)}`, color: 0xFF0000 })
  .catch(e => console.error("Failed to send Discord message for unhandled rejection:", e));
});

console.log("Unite Students Contract Checker initialized and running. Cron scheduled.");
