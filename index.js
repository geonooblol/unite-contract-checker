// Unite Students Contract Checker Bot - vNext Attempt
// More targeted contract extraction based on provided HTML snippet.

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const { Webhook, MessageBuilder } = require('discord-webhook-node');
const cron = require('node-cron');
const dotenv = require('dotenv');
dotenv.config();

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const hook = new Webhook(WEBHOOK_URL || 'https://discord.com/api/webhooks/your-webhook-url-placeholder'); // Ensure a placeholder

const CHECK_INTERVAL = process.env.CHECK_INTERVAL || '0 */4 * * *';
const PROPERTY_URL = 'https://www.unitestudents.com/student-accommodation/medway/pier-quays';

const NAVIGATION_TIMEOUT = 75000; // Increased slightly
const PAGE_TIMEOUT = 100000;    // Increased slightly

// --- DEBUG HTML DUMP ---
// Set this to true ONLY IF the contract extraction fails again and you need fresh HTML.
const DUMP_CONTRACT_SECTION_HTML_FOR_DEBUG = process.env.DEBUG_HTML_DUMP === 'true' || false; 

async function sendDiscordMessage(content) {
  if (!hook.url || hook.url.includes('your-webhook-url-placeholder')) {
    console.warn('Discord webhook URL is not configured or is a placeholder. Skipping notification.');
    return;
  }
  try {
    const embed = new MessageBuilder()
      .setTitle(content.title)
      .setDescription(content.description)
      .setColor(content.color)
      .setFooter(`Checked at ${new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' })}`)
      .setURL(content.url || PROPERTY_URL)
      .setTimestamp();
    if (content.fields) content.fields.forEach(field => embed.addField(field.name, field.value, field.inline));
    await hook.send(embed);
    console.log('Discord notification sent successfully');
  } catch (error) {
    console.error('Failed to send Discord notification:', error.message);
    try {
      await hook.send(`**${content.title}**\n${content.description.substring(0,1900)}`);
    } catch (err) {
      console.error('Failed to send simplified Discord notification:', err.message);
    }
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
      if (await waitForSelectorWithTimeout(page, selector, 7000)) {
        await page.click(selector);
        console.log(`Successfully clicked ${description} using: ${selector}`);
        await page.waitForTimeout(3500); // Slightly longer pause for UI to react
        return true;
      } else {
        console.log(`Selector ${selector} for ${description} not visible/found in time.`);
      }
    } catch (e) {
      console.log(`Failed to click ${description} using selector: ${selector}. Error: ${e.message}`);
    }
  }
  if (textContent) { /* ... (textContent click logic - kept brief for focus) ... */ }
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
        // '--single-process', // Can be unstable, use with caution
        '--disable-gpu', '--window-size=1366,768' // Common resolution
      ],
      protocolTimeout: 120000 // Longer protocol timeout
    });
    
    page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'); // Updated UA
    page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT);
    page.setDefaultTimeout(PAGE_TIMEOUT);
    
    await page.setRequestInterception(true);
    page.on('request', (request) => { /* ... (request interception - no change) ... */ 
      const resourceType = request.resourceType();
      const url = request.url().toLowerCase();
      if (['font', 'image', 'media', 'stylesheet'].includes(resourceType) && !url.includes('essential')) {
        request.abort();
      } else if (url.includes('analytics') || url.includes('tracking') || url.includes('hotjar') || url.includes('googletagmanager')) {
        request.abort();
      } else {
        request.continue();
      }
    });

    console.log('Navigating to property page...');
    await page.goto(PROPERTY_URL, { waitUntil: 'domcontentloaded' });
    console.log('Page loaded');
    
    // Cookie consent (simplified, as it wasn't blocking)
    try {
      console.log('Attempting to handle cookie consent (quick check)...');
      const cookieSelector = '[id*="onetrust-accept-btn"], button[data-testid*="accept"]';
      if (await waitForSelectorWithTimeout(page, cookieSelector, 5000)) {
        await page.click(cookieSelector, {timeout: 5000});
        console.log('Potential cookie button clicked.');
        await page.waitForTimeout(1500);
      } else {
          console.log('No prominent cookie button found quickly.');
      }
    } catch (e) { console.log('Minor error during cookie consent:', e.message); }
    
    console.log('Current page URL:', page.url());
    
    const findRoomSuccess = await enhancedClick(page, ['button[data-event="book_a_room"]'], 'Find a room', 'Find a room button');
    if (!findRoomSuccess) throw new Error('Could not click "Find a room" button.');
    
    console.log('Waiting for URL to potentially change or modal to appear...');
    try {
        await page.waitForFunction(
            (initialUrl) => window.location.href !== initialUrl && window.location.href.includes('book=true'),
            { timeout: 7000 },
            page.url()
        );
        console.log('URL changed or book=true confirmed.');
    } catch (e) {
        console.log("URL didn't change as expected or timed out. Assuming modal on same page or dynamic content load.");
    }
    await page.waitForTimeout(4000); // Increased wait after "Find a room"
    console.log('Current URL after Find Room attempt:', page.url());

    console.log('Waiting for room type selection interface...');
    if (!await waitForSelectorWithTimeout(page, 'button[data-room_type="ENSUITE"]', 25000)) { // Wait specifically for ENSUITE
        throw new Error("Ensuite room type button not found/visible in time.");
    }
    console.log('Ensuite room type button found.');
    
    const ensuiteSuccess = await enhancedClick(page, ['button[data-room_type="ENSUITE"]'], 'En-suite', 'Ensuite option');
    if (!ensuiteSuccess) throw new Error('Could not click "Ensuite" option.');
    
    console.log('Waiting for contract options to appear/load...');
    // Wait for the "Reserve your room" span specifically, as it's our anchor
    if (!await waitForSelectorWithTimeout(page, 'span ::-p-text(Reserve your room)', 25000)) { // Using Puppeteer's text selector
        const contentCheck = await page.content();
        if (!contentCheck.toLowerCase().includes("reserve your room")) {
             console.log("Page content snippet:", contentCheck.substring(0,3000));
             throw new Error("'Reserve your room' text not found on page after clicking ensuite.");
        }
        console.log("'Reserve your room' text found broadly, but not as a distinct visible span. Proceeding with caution.");
    } else {
        console.log("'Reserve your room' span confirmed visible.");
    }
    await page.waitForTimeout(3000); // Extra pause for content to settle

    console.log(`On page for contract extraction: ${await page.title()} | URL: ${page.url()}`);

    if (DUMP_CONTRACT_SECTION_HTML_FOR_DEBUG) { /* ... (HTML dump logic - unchanged but now off by default) ... */ }
    
    console.log('Extracting contract information...');
    const contracts = await page.evaluate(() => {
      const results = [];
      function findContractTerms(contextNode) {
        let reserveSection = null;
        const reserveRoomSpan = Array.from(contextNode.querySelectorAll('span')).find(
            s => s.textContent.trim().toLowerCase() === "reserve your room"
        );

        if (reserveRoomSpan && reserveRoomSpan.parentElement) {
            reserveSection = reserveRoomSpan.parentElement;
            // console.log('Found reserveSection based on "Reserve your room" span parent.'); // Browser console
        } else {
            console.error("Could not find 'Reserve your room' span or its parent in page.evaluate."); // Browser console
            // As a fallback, try to find the div with class mt-9 if span method fails
            reserveSection = contextNode.querySelector('div.mt-9'); // From Tommy's original specific HTML
            if(reserveSection && !reserveSection.textContent.toLowerCase().includes("reserve your room")) {
                // If mt-9 is found but doesn't contain the text, it's probably the wrong one.
                console.warn("Fallback 'div.mt-9' found, but doesn't contain 'Reserve your room'. May not be correct section.");
                // reserveSection = null; // Uncomment to be stricter
            } else if (reserveSection) {
                 console.log("Found reserveSection using fallback 'div.mt-9'."); // Browser console
            }
        }

        if (!reserveSection) {
             console.error("`reserveSection` could not be definitively identified."); // Browser console
             return false;
        }

        const optionsContainer = reserveSection.querySelector('div[role="radiogroup"]');
        if (!optionsContainer) {
            console.error("Could not find 'optionsContainer' (div[role=\"radiogroup\"]) within the reserveSection."); // Browser console
            // Fallback: assume reserveSection *is* the optionsContainer if role="radiogroup" is missing
            // This can happen if the structure is flatter than expected.
            // Check if reserveSection itself could be the container of pricing options.
            const directOptions = reserveSection.querySelectorAll('div[id="pricing-option"][role="radio"]');
            if (directOptions.length > 0) {
                console.warn("`div[role=\"radiogroup\"]` not found. Using `reserveSection` as `optionsContainer` based on direct children.");
                // The pricingOptions query below will run on reserveSection.
            } else {
                 return false; // Can't find a clear container for options
            }
        }
        
        // Use optionsContainer if found, otherwise fallback to reserveSection itself to find pricingOptions
        const actualContainerToQuery = optionsContainer || reserveSection;

        const pricingOptions = actualContainerToQuery.querySelectorAll('div[id="pricing-option"][role="radio"]');
        if (pricingOptions && pricingOptions.length > 0) {
            // console.log(`Found ${pricingOptions.length} pricing options.`); // Browser console
            pricingOptions.forEach(option => {
              const text = option.textContent || '';
              const weekMatch = text.match(/(\d{1,2})\s*weeks?/i);
              const term = weekMatch ? weekMatch[0] : 'Unknown term';
              
              const dateMatch = text.match(/\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\s*-\s*\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}/);
              const dates = dateMatch ? dateMatch[0] : 'Unknown dates';
              
              let type = 'Unknown type';
              if (text.toLowerCase().includes('full year')) type = 'Full Year';
              else if (text.toLowerCase().includes('academic year')) type = 'Academic Year';
              else if (text.toLowerCase().includes('semester')) type = 'Semester';
              else if (weekMatch && parseInt(weekMatch[1]) < 40 && parseInt(weekMatch[1]) > 5 ) type = 'Partial Year / Semester';

              const priceMatch = text.match(/£(\d+(\.\d{2})?)/);
              const price = priceMatch ? `£${priceMatch[1]}` : 'Unknown price';
              
              if (term !== 'Unknown term') {
                results.push({ term, dates, type, price, rawText: text.substring(0,150).replace(/\s+/g, ' ') });
              }
            });
            return true; // Found and processed options
        } else {
            console.error("No 'pricingOptions' found using 'div[id=\"pricing-option\"][role=\"radio\"]' within the container.", actualContainerToQuery.innerHTML.substring(0,500)); // Browser console
        }
        return false; // No options processed
      }
      
      // Call with document as the context, as the HTML snippet implies it's in the main flow
      if (!findContractTerms(document)) {
          console.warn("Primary contract term extraction logic (findContractTerms) did not yield results or failed to find sections.");
      }
      
      // Fallback broad scan (only if primary finds nothing AND no errors stopped it)
      if (results.length === 0) {
        console.warn("Primary extraction found 0 contracts. Trying broad page scan for 'X weeks'.");
        const bodyText = document.body.innerText;
        const weekPattern = /(\d{1,2})\s*weeks?/gi;
        let match;
        const foundTerms = new Set(); 
        while ((match = weekPattern.exec(bodyText)) !== null) {
            if (match[1] !== '51') { 
                const contextStart = Math.max(0, match.index - 70); // More context
                const contextEnd = Math.min(bodyText.length, match.index + match[0].length + 70);
                const context = bodyText.substring(contextStart, contextEnd).replace(/\s+/g, ' ').trim();
                if (!foundTerms.has(match[0].toLowerCase() + context.substring(0,30))) { // Basic de-dupe
                     results.push({
                        term: match[0],
                        dates: "Broad scan: " + context,
                        type: "Broad Scan Result",
                        price: "N/A (Broad Scan)",
                        rawText: context
                    });
                    foundTerms.add(match[0].toLowerCase() + context.substring(0,30));
                }
            }
        }
        if (foundTerms.size > 0) {
            console.log(`Broad scan found ${foundTerms.size} potential non-51-week terms.`);
        }
      }
      return results;
    });
    
    console.log('Extracted contracts:', JSON.stringify(contracts, null, 2));
    
    if (!contracts || contracts.length === 0) {
      // ... (No details found message - unchanged)
      const pageStateInfo = await page.evaluate(() => ({ url: window.location.href, title: document.title }));
      await sendDiscordMessage({ title: '❓ Contract Check - No Details Found', description: `The bot couldn't find any contract information using primary or fallback methods.\nPage: ${pageStateInfo.title}\nURL: ${pageStateInfo.url}`, color: 15105570, url: page.url() });
    } else {
      const newContracts = contracts.filter(contract => 
        contract.term && 
        !contract.term.toLowerCase().includes('51 week') && // Be specific about '51 week'
        contract.term !== 'Unknown term'
      );
      
      if (newContracts.length > 0) {
        // ... (New contract message - unchanged, but check rawText in Discord message)
         await sendDiscordMessage({
          title: '🎉 New Contract Options Available!',
          description: 'Non-standard contract options may have been found for ensuite rooms at Pier Quays!',
          color: 5814783, 
          fields: newContracts.map(contract => ({
            name: `${contract.term} (${contract.type})`,
            value: `📅 ${contract.dates}\n💰 ${contract.price}\nRaw: ${contract.rawText.substring(0,200)}`, // Show more raw text
            inline: false
          })),
          url: page.url()
        });
      } else {
        // ... (Standard only message - unchanged)
        if (process.env.SEND_STATUS_UPDATES === 'true') {
          await sendDiscordMessage({ title: 'Contract Check (Standard Only/None Found)', description: `Only standard 51-week options found, or no other options. Parsed: ${contracts.length > 0 ? contracts[0].rawText.substring(0,100)+'...' : '0 items'}.`, color: 10197915, url: page.url() });
        }
      }
    }
    
  } catch (error) {
    console.error('Error during check:', error);
    // ... (Error reporting - unchanged)
    let errorDetails = `Error: ${error.message}\nStack: ${error.stack ? error.stack.substring(0,1000) : 'No stack'}`;
    if (page) { try { errorDetails += `\nURL: ${page.url()}, Title: ${await page.title()}`; } catch (e) {/*ignore*/} }
    await sendDiscordMessage({ title: '❌ Bot Error', description: `\`\`\`${errorDetails.substring(0, 1900)}\`\`\``, color: 15158332 });
  } finally {
    if (browser) { console.log('Closing browser...'); await browser.close(); }
  }
}

// --- Health check and scheduling (largely unchanged) ---
if (process.env.ENABLE_HEALTH_CHECK === 'true') { /* ... */ }
cron.schedule(CHECK_INTERVAL, checkForContracts, { scheduled: true, timezone: 'Europe/London' });

if (!DUMP_CONTRACT_SECTION_HTML_FOR_DEBUG) {
    const startupDelay = Math.floor(Math.random() * 7000) + 3000; // 3-10 seconds
    console.log(`Bot starting initial check in ${startupDelay/1000}s...`);
    setTimeout(checkForContracts, startupDelay);
} else {
    console.log("HTML DUMP MODE IS ON - running checkForContracts once for debug.");
    (async () => {
        await checkForContracts();
        // console.log("HTML DUMP run complete. Exiting for debug mode.");
        // process.exit(0); // Uncomment if you want it to exit after one debug run
    })();
}

process.on('SIGINT', () => { console.log('Bot shutting down...'); process.exit(0); });
process.on('uncaughtException', (err) => { console.error('Uncaught global exception:', err); });
