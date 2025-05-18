// Unite Students Contract Checker Bot - Enhanced Version
// Monitors for non-51-week ensuite contracts at Pier Quays
// More robust selectors and navigation handling, with HTML debugging for contract extraction

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const { Webhook, MessageBuilder } = require('discord-webhook-node');
const cron = require('node-cron');
const dotenv = require('dotenv');
dotenv.config();

// Discord webhook URL - Set this in your environment variables
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const hook = new Webhook(WEBHOOK_URL || 'https://discord.com/api/webhooks/your-webhook-url');

// Configuration
const CHECK_INTERVAL = process.env.CHECK_INTERVAL || '0 */4 * * *'; // Every 4 hours by default
const PROPERTY_URL = 'https://www.unitestudents.com/student-accommodation/medway/pier-quays';
const DEFAULT_CONTRACT = '51 weeks'; // The contract we want to avoid

// Set timeouts
const NAVIGATION_TIMEOUT = 60000; 
const PAGE_TIMEOUT = 90000; 

// ---- SET THIS TO TRUE FOR ONE RUN TO GET HTML ----
const DUMP_CONTRACT_SECTION_HTML_FOR_DEBUG = process.env.DEBUG_HTML_DUMP === 'true' || false; // Control with env var or set true manually for a run

// Function to send discord messages
async function sendDiscordMessage(content) {
  try {
    const embed = new MessageBuilder()
      .setTitle(content.title)
      .setDescription(content.description)
      .setColor(content.color)
      .setFooter(`Checked at ${new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' })}`)
      .setURL(content.url || PROPERTY_URL)
      .setTimestamp();
    
    if (content.fields) {
      content.fields.forEach(field => {
        embed.addField(field.name, field.value, field.inline);
      });
    }
    
    await hook.send(embed);
    console.log('Discord notification sent successfully');
  } catch (error) {
    console.error('Failed to send Discord notification:', error.message);
    try {
      await hook.send(`**${content.title}**\n${content.description.substring(0,1900)}`); // Keep it short for fallback
    } catch (err) {
      console.error('Failed to send even simplified Discord notification:', err.message);
    }
  }
}

// Helper function to wait for selectors with timeout
async function waitForSelectorWithTimeout(page, selector, timeout = 10000) {
  try {
    await page.waitForSelector(selector, { visible: true, timeout });
    return true;
  } catch (error) {
    // console.log(`Selector not found within timeout: ${selector}`); // Can be noisy
    return false;
  }
}

// Enhanced click function
async function enhancedClick(page, selectors, textContent, description = "element") {
  for (const selector of Array.isArray(selectors) ? selectors : [selectors]) {
    try {
      console.log(`Attempting to click ${description} using selector: ${selector}`);
      if (await waitForSelectorWithTimeout(page, selector, 7000)) { // Shorter timeout for individual selectors
        await page.click(selector);
        console.log(`Successfully clicked ${description} using: ${selector}`);
        await page.waitForTimeout(3000); 
        return true;
      } else {
        console.log(`Selector ${selector} for ${description} not visible/found in time.`);
      }
    } catch (e) {
      console.log(`Failed to click ${description} using selector: ${selector}. Error: ${e.message}`);
    }
  }

  if (textContent) {
    try {
      console.log(`Attempting to click ${description} by text content: "${textContent}"`);
      const clicked = await page.evaluate((text) => {
        const elements = Array.from(document.querySelectorAll('button, a, div[role="button"], [class*="button"]'));
        const targetElement = elements.find(el => el.textContent.trim().toLowerCase().includes(text.toLowerCase()));
        if (targetElement) {
          const rect = targetElement.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0 && getComputedStyle(targetElement).visibility !== 'hidden') {
            targetElement.click();
            return true;
          }
        }
        return false;
      }, textContent);
      if (clicked) {
        console.log(`Successfully clicked ${description} by text content`);
        await page.waitForTimeout(3000);
        return true;
      }
    } catch (e) {
      console.log(`Failed to click ${description} by text content: ${e.message}`);
    }
  }
  console.log(`Could not click ${description} using any provided method.`);
  return false;
}

// Main function to check for contracts
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
        '--single-process', // Might help on low resource, but can be less stable
        '--disable-gpu', '--window-size=1280,920'
      ],
      // protocolTimeout: 120000 // Increase protocol timeout if Runtime.callFunctionOn errors persist
    });
    
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 920 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');
    page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT);
    page.setDefaultTimeout(PAGE_TIMEOUT);
    
    await page.setRequestInterception(true);
    page.on('request', (request) => {
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
    
    try {
      console.log('Attempting to handle cookie consent...');
      const cookieSelectors = [
        '[id*="onetrust-accept-btn"]', 'button[data-testid*="accept"]', 'button[aria-label*="Accept"]', 
        'button[aria-label*="Allow"]', '#hs-eu-confirmation-button'
      ];
      let clickedACookieButton = false;
      for (const selector of cookieSelectors) {
        if (await page.$(selector)) { // Check if element exists before trying to click
          try {
            await page.click(selector, {timeout: 5000}); // Add small timeout to click
            console.log(`Clicked cookie consent button using selector: ${selector}`);
            await page.waitForTimeout(1500);
            clickedACookieButton = true;
            break; 
          } catch (clickError) {
            console.log(`Cookie button ${selector} found but click failed: ${clickError.message}`);
          }
        }
      }
      if (!clickedACookieButton) {
        console.log('No cookie button clicked via specific selectors, trying text-based (if any text keywords).');
        // Text-based click for cookies was removed for brevity as it wasn't hitting, can be re-added if needed
      }
    } catch (e) {
      console.log('Error during cookie consent handling:', e.message);
    }
    
    console.log('Current page URL:', page.url());
    
    const findRoomSuccess = await enhancedClick(page, ['button[data-event="book_a_room"]'], 'Find a room', 'Find a room button');
    if (!findRoomSuccess) throw new Error('Could not click "Find a room" button.');
    
    // Wait for navigation/modal, check URL to confirm
    await page.waitForFunction(currentUrl => window.location.href !== currentUrl, {timeout: 10000}, page.url()).catch(() => console.log("URL didn't change after Find Room, or timed out waiting. Assuming modal."));
    await page.waitForTimeout(3000); // Additional wait
    console.log('Current URL after Find Room attempt:', page.url());

    console.log('Waiting for room type selection interface to be ready...');
    if (!await waitForSelectorWithTimeout(page, 'button[data-room_type]', 20000)) {
        console.warn("Room type selection interface not detected. Will attempt to proceed but may fail.");
    } else {
        console.log('Room type selection interface appears to be ready.');
    }
    
    const ensuiteSuccess = await enhancedClick(page, ['button[data-room_type="ENSUITE"]', 'button[aria-label="Select ENSUITE"]'], 'En-suite', 'Ensuite option');
    if (!ensuiteSuccess) throw new Error('Could not click "Ensuite" option.');
    
    await page.waitForTimeout(5000); // Wait for contract info to potentially load
    console.log(`On page for contract extraction: ${await page.title()} | URL: ${page.url()}`);

    // ---- HTML DUMP LOGIC ----
    if (DUMP_CONTRACT_SECTION_HTML_FOR_DEBUG) {
        console.log("---- DEBUG: Attempting to dump HTML for contract section ----");
        await sendDiscordMessage({ title: "DEBUG HTML DUMP Active", description: "Attempting to grab HTML of contract section.", color: 0xFFFF00 });
        try {
            await page.waitForSelector('span, div', {timeout: 5000}); // Wait for some content
            const reserveSectionHTML = await page.evaluate(() => {
                // Try to find a known element that should be near the contracts
                const reserveHeadingText = "Reserve your room"; // Text to look for
                const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, span, p, div'));
                const targetHeading = headings.find(el => el.textContent.trim().toLowerCase().includes(reserveHeadingText.toLowerCase()));

                if (targetHeading) {
                    // Find a common ancestor that likely contains all contract options
                    let container = targetHeading.closest('div[class*="mt-"]'); // Common Unite class pattern
                    if (!container) container = targetHeading.closest('section');
                    if (!container) container = targetHeading.parentElement;
                    while(container && container.parentElement && container.textContent.length < 500 && container.children.length < 10) {
                        // Go up if current container is too small, trying to get a larger chunk
                        container = container.parentElement;
                    }
                    return container ? container.outerHTML : `Found "${reserveHeadingText}" but no suitable parent container.`;
                }
                return `Could not find heading/span containing "${reserveHeadingText}". Body snapshot: ` + (document.body ? document.body.innerText.substring(0, 1000) : "No body");
            });
            console.log("---- HTML DUMP FOR CONTRACT SECTION ----\n", reserveSectionHTML.substring(0, 15000), "\n---- END HTML DUMP ----");
            // Send to Discord (split if too long)
            const chunks = [];
            for (let i = 0; i < reserveSectionHTML.length; i += 1900) {
                chunks.push(reserveSectionHTML.substring(i, i + 1900));
            }
            for (const chunk of chunks) {
                await sendDiscordMessage({ title: "DEBUG Contract Section HTML", description: `\`\`\`html\n${chunk}\n\`\`\``, color: 0x0000FF });
                await page.waitForTimeout(500); // Avoid rate limiting
            }
        } catch (htmlError) {
            console.log("Error trying to get specific HTML for debug: ", htmlError.message);
            await sendDiscordMessage({ title: "DEBUG HTML DUMP FAILED", description: htmlError.message, color: 0xFF0000 });
        }
    }
    // ---- END HTML DUMP LOGIC ----
    
    console.log('Extracting contract information...');
    const contracts = await page.evaluate(() => {
      const results = [];
      // ---- THIS IS THE SECTION TO REFINE BASED ON THE HTML DUMP ----
      function findContractTerms() {
        let reserveSection = null;
        const possibleSectionHeaders = ["Reserve your room", "Your choices", "Available rooms"]; // Add more if needed
        let headerElement = null;

        for (const headerText of possibleSectionHeaders) {
            const elements = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, span, p, div'));
            headerElement = elements.find(el => el.textContent.trim().toLowerCase().includes(headerText.toLowerCase()));
            if (headerElement) break;
        }

        if (headerElement) {
            // Try to find a sensible parent container for the contract options
            // This will need to be adjusted based on the actual HTML structure from the dump
            reserveSection = headerElement.closest('div[class*="mt-"]'); // Example: common Unite class pattern
            if (!reserveSection || reserveSection.textContent.length < 100) { // If too small or not found
                reserveSection = headerElement.parentElement; // Fallback
                // Go up a few levels if parentElement is too specific
                for(let i=0; i<3 && reserveSection && reserveSection.parentElement && reserveSection.children.length < 5; i++) {
                    reserveSection = reserveSection.parentElement;
                }
            }
        } else {
            // Fallback: if no header found, maybe the whole page context is the reserve section (e.g. simple layout)
            // This is a wild guess and likely needs refinement based on HTML dump
            // reserveSection = document.body.querySelector('div containing contracts'); // Needs specific selector from dump
            console.error("Contract section header not found in page.evaluate."); // Log to browser console
        }

        if (reserveSection) {
          // TODO: THIS SELECTOR *MUST* BE UPDATED BASED ON THE HTML DUMP
          // It needs to target the individual, repeating elements for each contract term.
          // The original example was: <div id="pricing-option" role="radio" ...>
          // Let's try a more generic approach that might catch common card-like structures.
          const pricingOptions = reserveSection.querySelectorAll(
            'div[role="radio"], div[id*="pricing-option"], div[class*="pricing-option"], div[class*="room-option"], div[class*="contract-term"], li[class*="option"]'
          ); 
          
          if (pricingOptions && pricingOptions.length > 0) {
            pricingOptions.forEach(option => {
              const text = option.textContent || '';
              const weekMatch = text.match(/(\d{1,2})\s*weeks?/i); // 1 or 2 digits for weeks
              const term = weekMatch ? weekMatch[0] : 'Unknown term';
              
              const dateMatch = text.match(/\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\s*-\s*\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}/);
              const dates = dateMatch ? dateMatch[0] : 'Unknown dates';
              
              let type = 'Unknown type';
              if (text.toLowerCase().includes('full year')) type = 'Full Year';
              else if (text.toLowerCase().includes('academic year')) type = 'Academic Year';
              else if (text.toLowerCase().includes('semester')) type = 'Semester';
              else if (weekMatch && parseInt(weekMatch[1]) < 40) type = 'Short Term'; // Guess type

              const priceMatch = text.match(/£(\d+(\.\d{2})?)/);
              const price = priceMatch ? `£${priceMatch[1]}` : 'Unknown price';
              
              // Only add if we found a week term and it's not the default one we want to ignore
              if (term !== 'Unknown term') {
                results.push({ term, dates, type, price, rawText: text.substring(0,150).replace(/\s+/g, ' ') });
              }
            });
          } else {
            console.error("No pricingOption elements found within the identified reserveSection.", reserveSection.innerHTML.substring(0,500)); // Browser console
          }
          return results.length > 0;
        } else {
            console.error("`reserveSection` could not be identified in page.evaluate."); // Browser console
        }
        return false;
      }
      
      findContractTerms(); // Call the function
      if (results.length === 0) {
        // If primary method fails, try a page-wide scan for week mentions as a last resort
        // This is very broad and might pick up unrelated numbers.
        console.warn("Primary contract term extraction failed, trying broad scan for 'X weeks'."); // Browser console
        const bodyText = document.body.innerText;
        const weekPattern = /(\d{1,2})\s*weeks?/gi;
        let match;
        const foundTerms = new Set(); // To avoid duplicates from broad scan
        while ((match = weekPattern.exec(bodyText)) !== null) {
            if (match[1] !== '51') { // Exclude the default
                 // Try to find context around the match
                const contextStart = Math.max(0, match.index - 50);
                const contextEnd = Math.min(bodyText.length, match.index + 50);
                const context = bodyText.substring(contextStart, contextEnd).replace(/\s+/g, ' ');
                
                if (!foundTerms.has(match[0])) {
                     results.push({
                        term: match[0],
                        dates: "Broad scan, context: " + context,
                        type: "Broad scan",
                        price: "N/A",
                        rawText: context
                    });
                    foundTerms.add(match[0]);
                }
            }
        }
      }
      return results;
    });
    // ---- END OF SECTION TO REFINE ----
    
    console.log('Extracted contracts:', JSON.stringify(contracts, null, 2));
    
    if (!contracts || contracts.length === 0) {
      console.log('No contract information found after evaluation.');
      // ... (existing no details found message)
      const pageStateInfo = await page.evaluate(() => ({ url: window.location.href, title: document.title }));
      await sendDiscordMessage({
        title: '❓ Contract Check - No Details Found',
        description: `The bot couldn't find any contract information. This could mean no rooms are available, a site change, or an issue with selectors.\nPage: ${pageStateInfo.title}\nURL: ${pageStateInfo.url}`,
        color: 15105570, url: page.url()
      });

    } else {
      const newContracts = contracts.filter(contract => 
        contract.term && 
        !contract.term.toLowerCase().includes('51 week') && // More specific exclusion
        contract.term !== 'Unknown term' &&
        contract.type !== "Broad scan" // Exclude broad scan if primary results exist
      );

      // If primary scan yielded results, but all were 51 weeks, and broad scan found others, consider those.
      if (newContracts.length === 0 && contracts.some(c => c.type === "Broad scan" && !c.term.toLowerCase().includes('51 week'))) {
          const broadScanNon51 = contracts.filter(c => c.type === "Broad scan" && !c.term.toLowerCase().includes('51 week'));
          if (broadScanNon51.length > 0) {
              console.log("Primary scan found only 51-week or nothing, but broad scan found other terms.");
              newContracts.push(...broadScanNon51);
              // Potentially mark these as less certain
              newContracts.forEach(c => { if (c.type === "Broad scan") c.certainty = "Low (Broad Scan)"; });
          }
      }
      
      if (newContracts.length > 0) {
        console.log('New contract options found!');
        // ... (existing new contract message)
        await sendDiscordMessage({
          title: '🎉 New Contract Options Available!',
          description: 'Non-standard contract options have been found for ensuite rooms at Pier Quays!',
          color: 5814783, 
          fields: newContracts.map(contract => ({
            name: `${contract.term} ${contract.certainty ? '('+contract.certainty+')' : ''}`,
            value: `📅 ${contract.dates}\n💰 ${contract.price}\n📋 ${contract.type}\nRaw: ${contract.rawText.substring(0,100)}`,
            inline: false
          })),
          url: page.url()
        });
      } else {
        console.log('Only standard 51-week contracts (or no non-51 week) found.');
        // ... (existing status update)
         if (process.env.SEND_STATUS_UPDATES === 'true') {
          await sendDiscordMessage({
            title: 'Contract Check Completed (Standard Only)',
            description: `Only standard 51-week options found, or no other options. Total contracts parsed: ${contracts.filter(c => c.type !== "Broad scan").length}.`,
            color: 10197915, url: page.url()
          });
        }
      }
    }
    
  } catch (error) {
    console.error('Error during check:', error);
    // ... (existing error reporting)
    let errorDetails = `Error: ${error.message}\nStack: ${error.stack ? error.stack.substring(0,1000) : 'No stack'}`;
    if (page) {
      try {
        errorDetails += `\nCurrent URL: ${page.url()}`;
        const title = await page.title().catch(() => 'Unknown Title');
        errorDetails += `\nPage title: ${title}`;
      } catch (e) { errorDetails += `\nError getting page details: ${e.message}`; }
    }
    await sendDiscordMessage({ title: '❌ Bot Error', description: `\`\`\`${errorDetails.substring(0, 1900)}\`\`\``, color: 15158332 });
  } finally {
    if (browser) {
      console.log('Closing browser...');
      await browser.close();
    }
  }
}

// Health check endpoint (no changes)
if (process.env.ENABLE_HEALTH_CHECK === 'true') {
  const http = require('http');
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running');
  });
  const port = process.env.PORT || 3000;
  server.listen(port, () => console.log(`Health check server running on port ${port}`));
}

// Schedule and initial run (no changes)
cron.schedule(CHECK_INTERVAL, checkForContracts, { scheduled: true, timezone: 'Europe/London' });
const startupDelay = Math.floor(Math.random() * 10000) + 5000;
console.log(`Unite Students Contract Checker Bot starting initial check in ${startupDelay/1000} seconds...`);
if (!DUMP_CONTRACT_SECTION_HTML_FOR_DEBUG) { // Don't run initial check if we're just debugging HTML
    setTimeout(checkForContracts, startupDelay);
} else {
    console.log("HTML DUMP MODE IS ON - running checkForContracts once for debug, then exiting if not in cron.");
    // For Render/Railway, this single run will happen, then the cron will take over if the process stays alive.
    // If you want it to exit after one debug run when DUMP_HTML is true:
    (async () => {
        await checkForContracts();
        if (DUMP_CONTRACT_SECTION_HTML_FOR_DEBUG && !process.env.CRON_RUNNING_AS_SERVICE) { // Add a var if you want to control exit
             console.log("HTML DUMP run complete. Exiting as not in service mode.");
             process.exit(0); 
        }
    })();
}

process.on('SIGINT', () => { console.log('Bot shutting down...'); process.exit(0); });
process.on('uncaughtException', (err) => { console.error('Uncaught exception:', err); });
