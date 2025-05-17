// Unite Students Contract Checker Bot - Railway Optimized Version
// Monitors for non-51-week ensuite contracts at Pier Quays

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const { Webhook, MessageBuilder } = require('discord-webhook-node');
const cron = require('node-cron');
const dotenv = require('dotenv');
const fs = require('fs').promises;
dotenv.config();

// Discord webhook URL - Set this in your environment variables
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const hook = new Webhook(WEBHOOK_URL || 'https://discord.com/api/webhooks/your-webhook-url');

// Configuration
const CHECK_INTERVAL = process.env.CHECK_INTERVAL || '0 */2 * * *'; // Every 2 hours by default
const PROPERTY_URL = 'https://www.unitestudents.com/student-accommodation/medway/pier-quays';
const BOOKING_URL = 'https://www.unitestudents.com/booking/search?city=MD&university=UNDEFINED&year=2025&bookingType=DIRECT&period=202526';
const DEFAULT_CONTRACT = '51 weeks'; // The contract we want to avoid

// Set protocol timeout explicitly (fix for the timeout errors)
const PROTOCOL_TIMEOUT = 60000; // 60 seconds
const NAVIGATION_TIMEOUT = 90000; // 90 seconds

// Function to send discord messages
async function sendDiscordMessage(content) {
  try {
    // Create a Discord embed
    const embed = new MessageBuilder()
      .setTitle(content.title)
      .setDescription(content.description)
      .setColor(content.color)
      .setFooter(content.footer?.text || `Checked at ${new Date().toLocaleString()}`)
      .setURL(content.url || PROPERTY_URL)
      .setTimestamp();
    
    // Add fields if they exist
    if (content.fields) {
      content.fields.forEach(field => {
        embed.addField(field.name, field.value, field.inline);
      });
    }
    
    // Send webhook
    await hook.send(embed);
    console.log('Discord notification sent successfully');
  } catch (error) {
    console.error('Failed to send Discord notification:', error.message);
    // Send a simpler message as fallback
    try {
      await hook.send(`**${content.title}**\n${content.description}`);
      console.log('Sent simplified Discord notification as fallback');
    } catch (err) {
      console.error('Failed to send even simplified Discord notification:', err.message);
    }
  }
}

// Function to upload a screenshot to Discord
async function sendScreenshot(path, description) {
  try {
    // Check if file exists
    await fs.access(path);
    await hook.sendFile(path);
    console.log(`Screenshot sent: ${path}`);
  } catch (error) {
    console.error(`Failed to send screenshot ${path}:`, error.message);
  }
}

// Wrapper function for puppeteer evaluate to handle timeouts better
async function safeEvaluate(page, fnc, errorMessage = "Evaluation failed") {
  try {
    return await Promise.race([
      page.evaluate(fnc),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Evaluation timed out")), 15000)
      )
    ]);
  } catch (error) {
    console.error(`${errorMessage}: ${error.message}`);
    return null;
  }
}

// Wrapper for safer navigation
async function safeNavigate(page, url, description = "page") {
  try {
    console.log(`Navigating to ${description}: ${url}`);
    await page.goto(url, { 
      waitUntil: 'domcontentloaded', // Using domcontentloaded instead of networkidle2 for speed
      timeout: NAVIGATION_TIMEOUT 
    });
    
    // Wait a bit more for content to settle
    await page.waitForTimeout(3000);
    
    return true;
  } catch (error) {
    console.error(`Navigation to ${description} failed: ${error.message}`);
    return false;
  }
}

// Wrapper for safer clicks
async function safeClick(page, selector, description = "element") {
  try {
    console.log(`Attempting to click ${description}: ${selector}`);
    
    // First check if element exists
    const elementExists = await page.$(selector);
    if (!elementExists) {
      console.log(`${description} not found: ${selector}`);
      return false;
    }
    
    // Try to make sure it's visible and clickable
    await page.waitForSelector(selector, { visible: true, timeout: 5000 });
    
    // Try direct click
    await page.click(selector);
    console.log(`Clicked ${description}`);
    
    // Give time for the click to have an effect
    await page.waitForTimeout(2000);
    
    return true;
  } catch (error) {
    console.error(`Failed to click ${description}: ${error.message}`);
    
    // Try alternative JavaScript click as fallback
    try {
      await page.evaluate((sel) => {
        const element = document.querySelector(sel);
        if (element) {
          element.click();
          return true;
        }
        return false;
      }, selector);
      console.log(`JS fallback click on ${description} succeeded`);
      await page.waitForTimeout(2000);
      return true;
    } catch (jsError) {
      console.error(`JS fallback click failed: ${jsError.message}`);
      return false;
    }
  }
}

async function checkForContracts() {
  console.log(`[${new Date().toISOString()}] Running contract check...`);
  
  let browser = null;
  
  try {
    console.log('Launching browser...');
    
    // Launch browser with stealth mode and explicit protocol timeout
    browser = await puppeteer.launch({ 
      headless: true,
      executablePath: '/usr/bin/google-chrome-stable',
      protocolTimeout: PROTOCOL_TIMEOUT, // Explicitly set protocol timeout
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-extensions',
        '--disk-cache-size=1'  // Minimal disk cache
      ]
    });
    
    // Create context to avoid cookie issues between runs
    const context = await browser.createIncognitoBrowserContext();
    const page = await context.newPage();
    
    // Set modest viewport to reduce memory consumption
    await page.setViewport({ width: 1024, height: 768 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');
    
    // Set longer timeouts
    page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT);
    page.setDefaultTimeout(PROTOCOL_TIMEOUT);
    
    // Disable resource-heavy content to improve performance
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      // Block non-essential resources
      const resourceType = req.resourceType();
      if (
        resourceType === 'image' || 
        resourceType === 'font' || 
        resourceType === 'media' ||
        (resourceType === 'stylesheet' && !req.url().includes('critical')) ||
        req.url().includes('analytics') ||
        req.url().includes('tracking')
      ) {
        req.abort();
      } else {
        req.continue();
      }
    });
    
    // Random delay helper - shorter delays to speed up process
    const randomDelay = () => new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
    
    // ===== DIRECT APPROACH: Go straight to property page =====
    // Using direct approach to reduce steps and potential points of failure
    console.log('Navigating directly to property page...');
    
    const navigationSuccessful = await safeNavigate(page, PROPERTY_URL, "property page");
    if (!navigationSuccessful) {
      throw new Error("Failed to navigate to property page");
    }
    
    await page.screenshot({ path: '/tmp/property-page.png' });
    
    // Handle cookie consent with multiple methods
    try {
      console.log('Checking for cookie banner...');
      
      // Try different cookie accept methods
      const cookieBannerExists = await page.evaluate(() => {
        // Method 1: Look for buttons with cookie text
        const cookieButtons = Array.from(document.querySelectorAll('button'));
        const acceptButton = cookieButtons.find(b => 
          b.textContent.includes('Accept') || 
          b.textContent.includes('Allow') ||
          (b.getAttribute('id') && b.getAttribute('id').includes('cookie'))
        );
        
        if (acceptButton) {
          acceptButton.click();
          return true;
        }
        
        // Method 2: Look for cookie banner and get the accept button
        const cookieBanners = Array.from(document.querySelectorAll('div[id*="cookie"], div[class*="cookie"]'));
        for (const banner of cookieBanners) {
          const buttons = banner.querySelectorAll('button');
          for (const button of buttons) {
            if (button.textContent.includes('Accept') || button.textContent.includes('Allow')) {
              button.click();
              return true;
            }
          }
        }
        
        return false;
      });
      
      if (cookieBannerExists) {
        console.log('Cookie consent handled via JS');
        await page.waitForTimeout(1000);
      } else {
        console.log('No cookie banner detected');
      }
    } catch (e) {
      console.log('Error handling cookie banner:', e.message);
    }
    
    // Look for "Find a room" button with more robust detection
    try {
      console.log('Looking for booking option...');
      
      // Try a variety of selectors that might contain the button
      const bookingSelectors = [
        'button[data-event="book_a_room"]',
        'button:has-text("Find a room")',
        'a:has-text("Find a room")',
        'button:has-text("Book now")',
        'a:has-text("Book now")',
        'div.flex button span:has-text("Find a room")'
      ];
      
      let buttonClicked = false;
      
      // Try each selector
      for (const selector of bookingSelectors) {
        try {
          const buttonExists = await page.$(selector);
          if (buttonExists) {
            await safeClick(page, selector, "booking button");
            buttonClicked = true;
            break;
          }
        } catch (error) {
          console.log(`Selector ${selector} failed:`, error.message);
        }
      }
      
      // If no selector worked, try JS evaluation
      if (!buttonClicked) {
        const clickResult = await page.evaluate(() => {
          // Find anything with "room" and "find" or "book" text that looks clickable
          const elements = [
            ...document.querySelectorAll('button'),
            ...document.querySelectorAll('a[href*="book"], a[href*="room"]')
          ];
          
          const bookButton = elements.find(el => 
            (el.textContent.toLowerCase().includes('find') && el.textContent.toLowerCase().includes('room')) ||
            (el.textContent.toLowerCase().includes('book') && el.textContent.toLowerCase().includes('now'))
          );
          
          if (bookButton) {
            bookButton.click();
            return true;
          }
          return false;
        });
        
        if (clickResult) {
          console.log("Found and clicked booking button via JS evaluation");
          buttonClicked = true;
        }
      }
      
      if (buttonClicked) {
        // Wait for navigation after clicking the button
        try {
          await page.waitForNavigation({ timeout: 10000 });
        } catch (navError) {
          console.log("No navigation occurred after clicking booking button");
        }
        
        await page.waitForTimeout(3000);
        await page.screenshot({ path: '/tmp/after-find-room.png' });
      } else {
        console.log("Could not find booking button, trying to continue anyway");
      }
    } catch (error) {
      console.error('Error with booking button:', error.message);
    }
    
    // Check current URL to determine next steps
    const currentUrl = await page.url();
    console.log('Current URL:', currentUrl);
    
    // Navigate to room selection if we're not already there
    if (!currentUrl.includes('booking')) {
      console.log('Not on booking page, trying direct navigation to booking URL');
      await safeNavigate(page, BOOKING_URL, "booking page");
      await page.screenshot({ path: '/tmp/booking-page.png' });
      
      // Look for Pier Quays property
      try {
        console.log('Looking for Pier Quays in property list...');
        
        const foundProperty = await page.evaluate(() => {
          // Look for anything with "Pier Quays" text
          const elements = [
            ...document.querySelectorAll('a'),
            ...document.querySelectorAll('div'),
            ...document.querySelectorAll('h2, h3, h4')
          ];
          
          const pierQuaysElement = elements.find(el => 
            el.textContent.includes('Pier Quays')
          );
          
          if (pierQuaysElement) {
            if (pierQuaysElement.tagName === 'A' && pierQuaysElement.href) {
              window.location.href = pierQuaysElement.href;
              return 'Navigated via href';
            } else {
              pierQuaysElement.click();
              return 'Clicked element';
            }
          }
          
          return false;
        });
        
        if (foundProperty) {
          console.log(`Found Pier Quays: ${foundProperty}`);
          await page.waitForTimeout(5000);
          await page.screenshot({ path: '/tmp/property-selected.png' });
        } else {
          console.log('Could not find Pier Quays in property list');
        }
      } catch (error) {
        console.error('Error finding property:', error.message);
      }
    }
    
    // Look for ENSUITE room option
    try {
      console.log('Looking for ENSUITE room option...');
      await page.screenshot({ path: '/tmp/room-options.png' });
      
      const ensuiteSelectors = [
        'button[data-room_type="ENSUITE"]',
        'button[data-event="select_room_type"][aria-label="Select ENSUITE"]',
        'button[id="room-option-card"]:has-text("En-suite")'
      ];
      
      let ensuiteSelected = false;
      
      // Try each selector
      for (const selector of ensuiteSelectors) {
        try {
          const exists = await page.$(selector);
          if (exists) {
            await safeClick(page, selector, "ENSUITE option");
            ensuiteSelected = true;
            break;
          }
        } catch (error) {
          console.log(`Selector ${selector} failed:`, error.message);
        }
      }
      
      // If no selector worked, try JS evaluation
      if (!ensuiteSelected) {
        const clickResult = await page.evaluate(() => {
          // Look for anything that mentions ensuite
          const elements = [
            ...document.querySelectorAll('button'),
            ...document.querySelectorAll('div[role="button"]'),
            ...document.querySelectorAll('div[class*="card"]')
          ];
          
          const ensuiteElement = elements.find(el => 
            el.textContent.includes('En-suite') || 
            el.textContent.includes('Ensuite') ||
            el.textContent.includes('ENSUITE')
          );
          
          if (ensuiteElement) {
            ensuiteElement.click();
            return true;
          }
          return false;
        });
        
        if (clickResult) {
          console.log("Found and clicked ENSUITE option via JS evaluation");
          ensuiteSelected = true;
        } else {
          console.log("Could not find ENSUITE option");
        }
      }
      
      if (ensuiteSelected) {
        await page.waitForTimeout(5000);
        await page.screenshot({ path: '/tmp/after-ensuite-selection.png' });
      }
    } catch (error) {
      console.error('Error selecting ENSUITE room:', error.message);
    }
    
    // ===== EXTRACT CONTRACT INFORMATION =====
    console.log('Looking for contract information...');
    await page.screenshot({ path: '/tmp/contract-info.png' });
    
    // Wait more time for contract info to load
    await page.waitForTimeout(5000);
    
    // Use a more gentle extraction that won't time out
    let contracts = [];
    
    try {
      // Break down the evaluation into smaller chunks to prevent timeouts
      // Step 1: Check if the page contains week information
      const containsWeekInfo = await safeEvaluate(page, () => {
        const bodyText = document.body.textContent;
        return {
          hasWeeks: /\d+\s*weeks?/i.test(bodyText),
          hasReserve: bodyText.includes('Reserve your room'),
          bodyTextSample: bodyText.substring(0, 200) // Sample for debugging
        };
      }, "Week info check");
      
      console.log('Page content check:', containsWeekInfo);
      
      if (containsWeekInfo && (containsWeekInfo.hasWeeks || containsWeekInfo.hasReserve)) {
        // Step 2: Extract pricing options text (simple version to avoid timeouts)
        const contractTextContent = await safeEvaluate(page, () => {
          // Find all divs that might contain contract info
          const possibleContainers = [
            ...document.querySelectorAll('div.mt-9'),
            ...document.querySelectorAll('div[id*="pricing"]'),
            ...document.querySelectorAll('div[role="radiogroup"]'),
            ...document.querySelectorAll('div:has(> span:contains("Reserve"))')
          ];
          
          // Get text content from these containers
          return possibleContainers.map(container => container.textContent);
        }, "Contract text extraction");
        
        console.log('Found contract containers:', contractTextContent);
        
        // Step 3: Simple regex-based extraction from the text
        if (contractTextContent && contractTextContent.length > 0) {
          // Process each container's text content
          contractTextContent.forEach(text => {
            if (!text) return;
            
            // Look for term lengths
            const weekMatches = text.match(/(\d+)\s*weeks?/gi);
            if (weekMatches) {
              weekMatches.forEach(weekMatch => {
                // Extract contract details
                let contractInfo = {
                  term: weekMatch,
                  dates: 'Unknown dates',
                  type: 'Unknown type',
                  price: 'Unknown price'
                };
                
                // Try to extract dates
                const dateMatch = text.match(/\d{2}\/\d{2}\/\d{2}\s*-\s*\d{2}\/\d{2}\/\d{2}/);
                if (dateMatch) {
                  contractInfo.dates = dateMatch[0];
                }
                
                // Try to extract contract type
                if (text.includes('Full Year')) {
                  contractInfo.type = 'Full Year';
                } else if (text.includes('Academic Year')) {
                  contractInfo.type = 'Academic Year';
                } else if (text.includes('Semester')) {
                  contractInfo.type = 'Semester';
                }
                
                // Try to extract price
                const priceMatch = text.match(/£(\d+)/);
                if (priceMatch) {
                  contractInfo.price = `£${priceMatch[1]}`;
                }
                
                contracts.push(contractInfo);
              });
            }
          });
        }
        
        // Step 4: If no contracts found, try a more basic approach
        if (contracts.length === 0) {
          console.log('No contracts found with container method, trying direct page scan');
          
          // Look for week mentions directly in the page
          const pageWeeks = await safeEvaluate(page, () => {
            const weekMatches = document.body.textContent.match(/(\d+)\s*weeks?/gi);
            return weekMatches || [];
          }, "Direct week search");
          
          console.log('Direct week mentions found:', pageWeeks);
          
          if (pageWeeks && pageWeeks.length > 0) {
            // Create basic contract entries
            pageWeeks.forEach(weekTerm => {
              contracts.push({
                term: weekTerm,
                dates: 'Found via direct scan',
                type: 'Unknown',
                price: 'Unknown'
              });
            });
          }
        }
      }
      
      // Remove duplicates
      const uniqueContracts = [];
      const seen = new Set();
      
      for (const contract of contracts) {
        // Create a unique key from term
        const key = contract.term;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueContracts.push(contract);
        }
      }
      
      console.log(`Found ${uniqueContracts.length} contract options:`, uniqueContracts);
      
      // Process the results
      if (uniqueContracts.length === 0) {
        // No contracts found, send a notification with screenshot
        console.log('No contract information found.');
        
        await sendDiscordMessage({
          title: '❓ Contract Check Completed - No Details Found',
          description: 'The bot couldn\'t find any contract information. This could mean either no rooms are available or the website structure has changed.',
          color: 15105570, // Orange/yellow
          url: await page.url()
        });
        
        // Send the screenshot
        await sendScreenshot('/tmp/contract-info.png', 'Current page state');
      } else {
        // Check for non-51-week contracts
        const newContracts = uniqueContracts.filter(contract => 
          contract.term && 
          !contract.term.includes('51') && 
          contract.term !== 'Unknown term'
        );
        
        if (newContracts.length > 0) {
          console.log('New contract options found!');
          
          // Send notification
          await sendDiscordMessage({
            title: '🎉 New Contract Options Available! 🎉',
            description: 'Non-standard contract options have been found for ensuite rooms at Pier Quays!',
            color: 5814783, // Green color
            fields: newContracts.map(contract => ({
              name: contract.term,
              value: `📅 ${contract.dates}\n💰 ${contract.price || 'Price unknown'}\n📋 ${contract.type || 'Type unknown'}`,
              inline: true
            })),
            url: await page.url()
          });
          
          // Send screenshot of the page
          await sendScreenshot('/tmp/contract-info.png', 'Contract options');
        } else {
          console.log('Only standard 51-week contracts found.');
          
          // Optional status update
          if (process.env.SEND_STATUS_UPDATES === 'true') {
            await sendDiscordMessage({
              title: 'Contract Check Completed',
              description: 'Only standard 51-week contracts are currently available.',
              color: 10197915, // Blue color
              url: await page.url()
            });
          }
        }
      }
    } catch (error) {
      console.error('Error processing contract information:', error.message);
      
      // Send error notification
      await sendDiscordMessage({
        title: '❌ Error Processing Contracts',
        description: `The bot encountered an error while processing contract details:\n\`\`\`${error.message}\`\`\``,
        color: 15158332, // Red color
      });
      
      // Send error screenshot
      await sendScreenshot('/tmp/contract-info.png', 'Error state');
    }
    
  } catch (error) {
    console.error('Critical error during check:', error);
    
    // Send error notification
    try {
      await sendDiscordMessage({
        title: '❌ Critical Bot Error',
        description: `The bot encountered a critical error:\n\`\`\`${error.message}\`\`\``,
        color: 15158332, // Red color
      });
    } catch (webhookErr) {
      console.error("Failed to send webhook:", webhookErr);
    }
  } finally {
    // Clean up
    if (browser) {
      console.log('Closing browser...');
      await browser.close();
    }
  }
}

// Schedule the check
cron.schedule(CHECK_INTERVAL, checkForContracts, {
  scheduled: true,
  timezone: 'Europe/London' // Set to UK timezone
});

// Initial check on startup (with longer delay)
console.log('Unite Students Contract Checker Bot starting...');
setTimeout(checkForContracts, 20000); // Delay the first check by 20 seconds

// Keep the process alive
process.on('SIGINT', () => {
  console.log('Bot shutting down...');
  process.exit(0);
});

// Prevent crashes
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});
