// Unite Students Contract Checker Bot
// Monitors for non-51-week ensuite contracts at Pier Quays

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const { Webhook } = require('discord-webhook-node');
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

async function sendDiscordMessage(content) {
  try {
    if (typeof content === 'string') {
      await hook.send(content);
    } else {
      // For embed objects
      await hook.send({
        username: 'Unite Students Contract Alert',
        avatarURL: 'https://www.unitestudents.com/favicon.ico',
        embeds: [content]
      });
    }
    console.log('Discord notification sent successfully');
  } catch (error) {
    console.error('Failed to send Discord notification:', error.message);
  }
}

async function checkForContracts() {
  console.log(`[${new Date().toISOString()}] Running contract check...`);
  
  let browser = null;
  
  try {
    console.log('Launching browser...');
    
    // Launch browser with stealth mode to avoid detection
    browser = await puppeteer.launch({ 
      headless: true,
      executablePath: '/usr/bin/google-chrome-stable',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    
    // Set a realistic viewport
    await page.setViewport({ width: 1366, height: 768 });
    
    // Add random delay between actions to seem more human-like
    const randomDelay = () => new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // Set longer timeouts
    page.setDefaultNavigationTimeout(120000); // 2 minutes
    page.setDefaultTimeout(60000); // 1 minute for other operations
    
    // Navigate to the property page
    console.log('Navigating to property page...');
    await page.goto(PROPERTY_URL, { waitUntil: 'networkidle2', timeout: 120000 });
    await randomDelay();
    
    // Take a screenshot to debug
    await page.screenshot({ path: '/tmp/initial-page.png' });
    console.log('Initial page screenshot saved');
    
    // Accept cookies if the banner appears
    try {
      console.log('Looking for cookie banner...');
      const cookieSelectors = [
        'button[data-cy="cookie-accept-all"]',
        'button[id*="cookie"]',
        'button[aria-label*="Accept"]',
        'button[aria-label*="Cookie"]'
      ];
      
      for (const selector of cookieSelectors) {
        const cookieButton = await page.$(selector);
        if (cookieButton) {
          console.log(`Cookie banner found with selector ${selector}, accepting...`);
          await cookieButton.click();
          await page.waitForTimeout(2000);
          break;
        }
      }
    } catch (e) {
      console.log('No cookie banner found or unable to click it');
    }
    
    // Debug: Log the current URL
    console.log('Current URL:', await page.url());
    
    // ====== DIRECT NAVIGATION TO BOOKING PAGE INSTEAD OF CLICKING ======
    try {
      // Navigate directly to the booking page instead of relying on the button click
      console.log('Navigating directly to booking page...');
      await page.goto('https://www.unitestudents.com/booking/medway/pier-quays', { 
        waitUntil: 'networkidle2',
        timeout: 60000 
      });
      
      await page.waitForTimeout(5000); // Give it time to load
      await page.screenshot({ path: '/tmp/booking-page.png' });
      console.log('Booking page screenshot saved');
      
      // Verify we're on the right page by looking for expected content
      const pageContent = await page.content();
      if (pageContent.includes('Select your room type') || 
          pageContent.includes('ENSUITE') || 
          pageContent.includes('En-suite')) {
        console.log('Successfully navigated to booking page!');
      } else {
        console.log('WARNING: Page content does not match expected booking page');
      }
      
    } catch (error) {
      console.error('Error navigating to booking page:', error.message);
      
      // If direct navigation fails, try the old method of clicking the button
      console.log('Trying fallback navigation method via button click...');
      try {
        await page.goto(PROPERTY_URL, { waitUntil: 'networkidle2' });
        await page.waitForTimeout(5000);
        
        await page.waitForSelector('button[data-event="book_a_room"]', { visible: true, timeout: 30000 });
        
        // Click using alternative method
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const findRoomButton = buttons.find(b => 
            b.textContent.includes('Find a room') || 
            b.dataset.event === 'book_a_room'
          );
          if (findRoomButton) findRoomButton.click();
        });
        
        await page.waitForTimeout(10000);
      } catch (fallbackError) {
        console.error('Fallback navigation also failed:', fallbackError.message);
      }
    }
    
    // Debug: Get the current URL
    console.log('Current URL after navigation to booking page:', await page.url());
    
    // ====== SELECT ENSUITE WITH MORE ROBUST METHODS ======
    try {
      console.log('Looking for ENSUITE option...');
      
      // Wait to see if the page has room type selection buttons
      await page.waitForTimeout(5000);
      await page.screenshot({ path: '/tmp/before-ensuite-selection.png' });
      
      // Check if we're already on a page with the "Reserve your room" section
      const hasReserveSection = await page.evaluate(() => {
        return !!document.querySelector('div.mt-9') || 
               document.body.innerText.includes('Reserve your room');
      });
      
      if (hasReserveSection) {
        console.log('Already on room reservation page, skipping ENSUITE selection');
      } else {
        // Try multiple methods to find and click the ENSUITE option
        const findEnsuiteMethods = [
          // Method 1: Look for the specific button with data attributes
          async () => {
            const button = await page.$('button[data-event="select_room_type"][data-room_type="ENSUITE"]');
            if (button) {
              console.log('Found ENSUITE button with data attributes');
              await button.click();
              return true;
            }
            return false;
          },
          
          // Method 2: Look for button with "En-suite" text
          async () => {
            const found = await page.evaluate(() => {
              const buttons = Array.from(document.querySelectorAll('button'));
              const ensuiteButton = buttons.find(b => 
                b.textContent.includes('En-suite') || 
                b.textContent.includes('ENSUITE') ||
                b.textContent.includes('Ensuite')
              );
              if (ensuiteButton) {
                ensuiteButton.click();
                return true;
              }
              return false;
            });
            
            if (found) {
              console.log('Found ENSUITE button by text content');
              return true;
            }
            return false;
          },
          
          // Method 3: Look for div/card with En-suite text that might be clickable
          async () => {
            const found = await page.evaluate(() => {
              const elements = Array.from(document.querySelectorAll('div[id*="room"], div[class*="card"], div[role="button"]'));
              const ensuiteElement = elements.find(el => 
                el.textContent.includes('En-suite') || 
                el.textContent.includes('ENSUITE') ||
                el.textContent.includes('Ensuite')
              );
              if (ensuiteElement) {
                ensuiteElement.click();
                return true;
              }
              return false;
            });
            
            if (found) {
              console.log('Found ENSUITE element in card/div');
              return true;
            }
            return false;
          }
        ];
        
        // Try each method in sequence
        let ensuiteSelected = false;
        for (const method of findEnsuiteMethods) {
          if (await method()) {
            ensuiteSelected = true;
            break;
          }
        }
        
        if (ensuiteSelected) {
          console.log('ENSUITE option selected successfully');
          await page.waitForTimeout(8000); // Wait for content to update
        } else {
          console.log('WARNING: Could not find or select ENSUITE option');
          
          // Let's try a more aggressive approach - just list all clickable elements
          console.log('Listing all buttons on the page for debugging:');
          const buttonTexts = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim());
          });
          console.log('Buttons found:', buttonTexts);
          
          // Check if we're already on a page with rooms
          const hasRooms = await page.evaluate(() => {
            return document.body.innerText.includes('Reserve your room') || 
                   document.body.innerText.includes('Rooms available');
          });
          
          if (hasRooms) {
            console.log('Page already contains room reservation content, continuing...');
          } else {
            throw new Error('Could not select ENSUITE room type');
          }
        }
      }
      
      // Take screenshot after room type selection
      await page.screenshot({ path: '/tmp/after-ensuite.png' });
      
    } catch (error) {
      console.error('Error selecting ENSUITE option:', error.message);
      // Continue anyway - we might already be on the right page
    }
    
    // Debug: Get the current URL
    console.log('Current URL after trying to select ENSUITE:', await page.url());
    
    // ====== LOOK FOR CONTRACT INFORMATION WITH MULTIPLE METHODS ======
    console.log('Looking for contract information...');
    
    try {
      // Check page source for relevant content
      const pageContent = await page.content();
      const pageText = await page.evaluate(() => document.body.innerText);
      
      console.log('Page URL:', await page.url());
      console.log('Page contains "Reserve your room":', pageText.includes('Reserve your room'));
      console.log('Page contains "51 weeks":', pageText.includes('51 weeks'));
      
      // Take a screenshot of whatever page we're on
      await page.screenshot({ path: '/tmp/final-page.png' });
      
      // Try different methods to find contract information
      let contracts = [];
      
      // Method 1: Look for pricing option elements
      contracts = await page.evaluate(() => {
        const contractDivs = document.querySelectorAll('#pricing-option, [id*="pricing"], [id*="contract"], [role="radio"]');
        if (!contractDivs || contractDivs.length === 0) {
          return [];
        }
        
        return Array.from(contractDivs).map(div => {
          // Try to extract term length
          let termText = '';
          const termElement = div.querySelector('.font-lato.text-md.font-bold.leading-120') || 
                             div.querySelector('[class*="font-bold"]') ||
                             div.querySelector('span[class*="text-md"]');
          
          if (termElement) {
            termText = termElement.textContent.trim();
          } else {
            // If no specific element, try to find text that matches a week pattern
            const allText = div.textContent;
            const weekMatch = allText.match(/(\d+)\s*weeks?/i);
            if (weekMatch) {
              termText = weekMatch[0];
            }
          }
          
          // Try to extract other information
          const allText = div.textContent;
          const dateRangeMatch = allText.match(/\d{2}\/\d{2}\/\d{2}\s*-\s*\d{2}\/\d{2}\/\d{2}/);
          const dateRange = dateRangeMatch ? dateRangeMatch[0] : 'Unknown dates';
          
          // Look for contract type
          let contractType = 'Unknown type';
          if (allText.includes('Full Year')) {
            contractType = 'Full Year';
          } else if (allText.includes('Academic Year')) {
            contractType = 'Academic Year';
          } else if (allText.includes('Semester')) {
            contractType = 'Semester';
          }
          
          // Look for price
          const priceMatch = allText.match(/£(\d+)/);
          const priceText = priceMatch ? `£${priceMatch[1]}` : 'Unknown price';
          
          return {
            term: termText || 'Unknown term',
            dates: dateRange,
            type: contractType,
            price: priceText
          };
        });
      });
      
      // If we found no contracts, try a more generic approach
      if (!contracts || contracts.length === 0) {
        console.log('No contracts found with specific selectors, trying generic text extraction...');
        
        contracts = await page.evaluate(() => {
          // Look for text containing weeks
          const textNodes = document.createTreeWalker(
            document.body, 
            NodeFilter.SHOW_TEXT, 
            null, 
            false
          );
          
          const contractInfo = [];
          let currentNode;
          
          while (currentNode = textNodes.nextNode()) {
            const text = currentNode.nodeValue.trim();
            if (text.match(/\d+\s*weeks?/i)) {
              // Found something about weeks, grab surrounding context
              const parentElement = currentNode.parentElement;
              const surroundingText = parentElement ? parentElement.textContent : text;
              
              // Extract details
              const termMatch = surroundingText.match(/(\d+)\s*weeks?/i);
              const dateMatch = surroundingText.match(/\d{2}\/\d{2}\/\d{2}\s*-\s*\d{2}\/\d{2}\/\d{2}/);
              const priceMatch = surroundingText.match(/£(\d+)/);
              
              if (termMatch) {
                contractInfo.push({
                  term: termMatch[0],
                  dates: dateMatch ? dateMatch[0] : 'Unknown dates',
                  type: surroundingText.includes('Full Year') ? 'Full Year' : 
                        surroundingText.includes('Academic Year') ? 'Academic Year' : 'Unknown type',
                  price: priceMatch ? `£${priceMatch[1]}` : 'Unknown price',
                  context: surroundingText.substring(0, 100) // Include some context for debugging
                });
              }
            }
          }
          
          return contractInfo;
        });
      }
      
      // Remove duplicates from the contracts array
      const uniqueContracts = [];
      const seen = new Set();
      
      for (const contract of contracts) {
        const key = `${contract.term}-${contract.price}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueContracts.push(contract);
        }
      }
      
      console.log(`Found ${uniqueContracts.length} contract options:`, uniqueContracts);
      
      if (uniqueContracts.length === 0) {
        // If still no contracts found, send an error message but with the screenshot
        await sendDiscordMessage({
          title: '❓ No Contract Details Found',
          description: 'The bot navigated to the site but could not extract contract information. An admin should check the bot.',
          color: 15105570, // Orange/yellow
          footer: {
            text: `Checked at ${new Date().toLocaleString()}`
          },
          url: PROPERTY_URL
        });
      } else {
        // Check if any non-51-week contracts exist
        const newContracts = uniqueContracts.filter(contract => !contract.term.includes('51 week'));
        
        if (newContracts.length > 0) {
          console.log('New contract options found!');
          
          // Send Discord notification
          await sendDiscordMessage({
            title: '🎉 New Contract Options Available! 🎉',
            description: 'Non-standard contract options have been found for ensuite rooms at Pier Quays!',
            color: 5814783, // Green color
            fields: newContracts.map(contract => ({
              name: `${contract.term} (${contract.type})`,
              value: `📅 ${contract.dates}\n💰 ${contract.price}`,
              inline: true
            })),
            footer: {
              text: `Checked at ${new Date().toLocaleString()}`
            },
            url: PROPERTY_URL
          });
        } else {
          console.log('No new contract options found. Still only 51-week contracts available.');
          
          // Optional: Send a status update message
          if (process.env.SEND_STATUS_UPDATES === 'true') {
            await sendDiscordMessage({
              title: 'Contract Check Complete',
              description: 'Still only 51-week contracts available at Pier Quays.',
              color: 10197915, // Blue color
              footer: {
                text: `Checked at ${new Date().toLocaleString()}`
              }
            });
          }
        }
      }
    } catch (error) {
      console.error('Error extracting contract information:', error.message);
      
      // Take error screenshot
      await page.screenshot({ path: '/tmp/error-final.png' });
      
      // Send error notification to Discord
      await sendDiscordMessage({
        title: '❌ Error Checking Contracts',
        description: `The bot encountered an error while extracting contract details:\n\`\`\`${error.message}\`\`\``,
        color: 15158332, // Red color
        footer: {
          text: `Error occurred at ${new Date().toLocaleString()}`
        }
      });
    }
  } catch (error) {
    console.error('Error during check:', error);
    
    // Send error notification to Discord
    try {
      await sendDiscordMessage({
        title: '❌ Error Running Check',
        description: `The bot encountered a critical error:\n\`\`\`${error.message}\`\`\``,
        color: 15158332, // Red color
        footer: {
          text: `Error occurred at ${new Date().toLocaleString()}`
        }
      });
    } catch (webhookErr) {
      console.error("Failed to send webhook:", webhookErr);
    }
  } finally {
    // Close the browser
    if (browser) {
      console.log('Closing browser...');
      await browser.close();
    }
  }
}

// Schedule the check based on cron expression
cron.schedule(CHECK_INTERVAL, checkForContracts, {
  scheduled: true,
  timezone: 'Europe/London' // Set to UK timezone
});

// Initial check on startup
console.log('Unite Students Contract Checker Bot starting...');
setTimeout(checkForContracts, 5000); // Delay the first check by 5 seconds to let everything initialize

// Keep the process alive
process.on('SIGINT', () => {
  console.log('Bot shutting down...');
  process.exit(0);
});

// Prevent the app from crashing on unhandled exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});
