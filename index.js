// Unite Students Contract Checker Bot - Updated & Optimized Version
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
    
    // Set a realistic viewport and user agent
    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');
    
    // Add random delay between actions to seem more human-like
    const randomDelay = () => new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // Set longer timeouts
    page.setDefaultNavigationTimeout(120000); // 2 minutes
    page.setDefaultTimeout(60000); // 1 minute for other operations
    
    // ===== DIRECT APPROACH: START FROM SEARCH RESULTS PAGE =====
    console.log('Starting with direct search approach...');
    
    // Navigate to search page with Medway (MD) pre-selected
    await page.goto(BOOKING_URL, { waitUntil: 'networkidle2', timeout: 60000 });
    await randomDelay();
    await page.screenshot({ path: '/tmp/search-page.png' });
    console.log('Search page loaded');
    
    // Handle cookie consent if it appears
    try {
      await page.waitForSelector('button[id*="cookie"], button[aria-label*="Cookie"], button:has-text("Accept All")', { 
        timeout: 5000,
        visible: true
      });
      
      await page.evaluate(() => {
        const cookieButtons = Array.from(document.querySelectorAll('button'));
        const acceptButton = cookieButtons.find(b => 
          b.textContent.includes('Accept All') || 
          b.textContent.includes('Allow All') ||
          (b.getAttribute('aria-label') && b.getAttribute('aria-label').includes('Cookie'))
        );
        if (acceptButton) acceptButton.click();
      });
      
      await page.waitForTimeout(2000);
      console.log('Cookie consent handled');
    } catch (e) {
      console.log('No cookie banner or already accepted');
    }
    
    // Click on Pier Quays in search results
    try {
      console.log('Looking for Pier Quays in search results...');
      await page.screenshot({ path: '/tmp/before-property-selection.png' });
      
      // Wait for search results to load
      await page.waitForTimeout(5000);
      
      // Try to find Pier Quays in the search results
      const foundProperty = await page.evaluate(() => {
        // Look for property cards or links containing "Pier Quays"
        const elements = [
          ...document.querySelectorAll('a[href*="pier-quays"]'),
          ...document.querySelectorAll('div[class*="card"]'),
          ...document.querySelectorAll('h2, h3, h4')
        ];
        
        const pierQuaysElement = elements.find(el => 
          el.textContent.includes('Pier Quays')
        );
        
        if (pierQuaysElement) {
          console.log('Found Pier Quays element:', pierQuaysElement);
          // If it's a link, navigate to it
          if (pierQuaysElement.tagName === 'A') {
            return {
              type: 'link',
              href: pierQuaysElement.href
            };
          }
          // Otherwise click it
          else {
            pierQuaysElement.click();
            return {
              type: 'element'
            };
          }
        }
        
        return false;
      });
      
      if (foundProperty) {
        console.log('Found Pier Quays property:', foundProperty);
        
        if (foundProperty.type === 'link') {
          await page.goto(foundProperty.href, { waitUntil: 'networkidle2' });
        } else {
          // Wait for navigation after click
          await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {
            console.log('No navigation occurred after clicking property');
          });
        }
        
        await page.waitForTimeout(5000);
        await page.screenshot({ path: '/tmp/property-page.png' });
      } else {
        console.log('Could not find Pier Quays in search results, trying direct property URL...');
        await page.goto(PROPERTY_URL, { waitUntil: 'networkidle2' });
      }
    } catch (error) {
      console.error('Error finding Pier Quays property:', error.message);
      console.log('Trying direct navigation to property page...');
      await page.goto(PROPERTY_URL, { waitUntil: 'networkidle2' });
    }
    
    // Take a screenshot of where we are
    await page.screenshot({ path: '/tmp/before-room-search.png' });
    
    // Now find and click "Find a room" or navigate directly to booking
    try {
      console.log('Looking for booking options...');
      
      // First check if we need to click "Find a room"
      const needsRoomButton = await page.evaluate(() => {
        return !!document.querySelector('button[data-event="book_a_room"]') || 
               document.body.innerText.includes('Find a room');
      });
      
      if (needsRoomButton) {
        console.log('Found "Find a room" button, clicking it...');
        
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button, a'));
          const roomButton = buttons.find(b => 
            (b.dataset && b.dataset.event === 'book_a_room') ||
            b.textContent.includes('Find a room') ||
            b.textContent.includes('Book a room')
          );
          if (roomButton) roomButton.click();
        });
        
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {
          console.log('No navigation after clicking Find a room');
        });
        
        await page.waitForTimeout(5000);
        await page.screenshot({ path: '/tmp/after-find-room.png' });
      }
    } catch (error) {
      console.error('Error clicking Find a room:', error.message);
    }
    
    // Now we should either be on the room selection page or the booking page
    console.log('Current URL:', await page.url());
    
    // Check for room type selection (ENSUITE)
    try {
      console.log('Looking for room type options...');
      await page.screenshot({ path: '/tmp/room-type-selection.png' });
      
      // Try to find and click ENSUITE option with multiple methods
      const foundEnsuite = await page.evaluate(() => {
        // Method 1: Look for specific data attributes
        const dataButtons = Array.from(document.querySelectorAll('button[data-room_type="ENSUITE"], button[data-event="select_room_type"]'));
        const ensuiteDataButton = dataButtons.find(b => 
          b.dataset.roomType === 'ENSUITE' || 
          (b.dataset.event === 'select_room_type' && b.textContent.includes('En-suite'))
        );
        
        if (ensuiteDataButton) {
          ensuiteDataButton.click();
          return 'data-attribute';
        }
        
        // Method 2: Look for text content
        const allButtons = Array.from(document.querySelectorAll('button'));
        const ensuiteTextButton = allButtons.find(b => 
          b.textContent.includes('En-suite') || 
          b.textContent.includes('Ensuite') ||
          b.textContent.includes('ENSUITE')
        );
        
        if (ensuiteTextButton) {
          ensuiteTextButton.click();
          return 'text-content';
        }
        
        // Method 3: Look for card elements
        const cards = Array.from(document.querySelectorAll('div[id*="room"], div[role="radio"], div[class*="card"]'));
        const ensuiteCard = cards.find(card => 
          card.textContent.includes('En-suite') || 
          card.textContent.includes('Ensuite') ||
          card.textContent.includes('ENSUITE')
        );
        
        if (ensuiteCard) {
          ensuiteCard.click();
          return 'card-element';
        }
        
        return false;
      });
      
      if (foundEnsuite) {
        console.log(`Found and clicked ENSUITE option using method: ${foundEnsuite}`);
        await page.waitForTimeout(8000);
        await page.screenshot({ path: '/tmp/after-ensuite-click.png' });
      } else {
        console.log('Could not find ENSUITE option, checking if we are already on the booking page...');
      }
    } catch (error) {
      console.error('Error selecting ENSUITE room type:', error.message);
    }
    
    // ===== CHECK FOR CONTRACT INFORMATION =====
    console.log('Looking for contract information...');
    await page.screenshot({ path: '/tmp/contract-check.png' });
    
    // Wait a moment for any dynamic content to load
    await page.waitForTimeout(5000);
    
    // First check if we're on the room selection page with contract info
    const pageContent = await page.content();
    const pageText = await page.evaluate(() => document.body.innerText);
    
    console.log('Current URL for contract check:', await page.url());
    console.log('Page contains "Reserve your room":', pageText.includes('Reserve your room'));
    console.log('Page contains "51 weeks":', pageText.includes('51 weeks'));
    console.log('Page contains "weeks":', /\d+\s*weeks/i.test(pageText));
    
    // Extract contract information
    let contracts = [];
    
    try {
      // Look for pricing options with expanded selectors
      contracts = await page.evaluate(() => {
        // First try to find standard pricing option elements
        const contractSections = [
          ...document.querySelectorAll('#pricing-option, [id*="pricing"], [role="radio"]'),
          ...document.querySelectorAll('div.mt-9 div, div[class*="contract"], div[class*="pricing"]')
        ];
        
        if (contractSections.length > 0) {
          return Array.from(contractSections).map(div => {
            // Extract all text content
            const allText = div.textContent.trim();
            
            // Look for term length
            let term = 'Unknown term';
            const weekMatch = allText.match(/(\d+)\s*weeks?/i);
            if (weekMatch) {
              term = weekMatch[0];
            }
            
            // Look for date range
            let dates = 'Unknown dates';
            const dateMatch = allText.match(/\d{2}\/\d{2}\/\d{2}\s*-\s*\d{2}\/\d{2}\/\d{2}/);
            if (dateMatch) {
              dates = dateMatch[0];
            }
            
            // Look for contract type
            let type = 'Unknown type';
            if (allText.includes('Full Year')) {
              type = 'Full Year';
            } else if (allText.includes('Academic Year')) {
              type = 'Academic Year';
            } else if (allText.includes('Semester')) {
              type = 'Semester';
            }
            
            // Look for price
            let price = 'Unknown price';
            const priceMatch = allText.match(/£(\d+)/);
            if (priceMatch) {
              price = `£${priceMatch[1]}`;
            }
            
            return { term, dates, type, price, context: allText.substring(0, 150) };
          });
        }
        
        // Fallback: Look through the entire page for week patterns
        const weekPatterns = [];
        const textWalker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          null,
          false
        );
        
        let node;
        while (node = textWalker.nextNode()) {
          const text = node.nodeValue.trim();
          const weekMatch = text.match(/(\d+)\s*weeks?/i);
          
          if (weekMatch) {
            // Get surrounding context
            let contextElement = node.parentElement;
            // Go up a few levels to get more context
            for (let i = 0; i < 3; i++) {
              if (contextElement.parentElement) {
                contextElement = contextElement.parentElement;
              }
            }
            
            const contextText = contextElement.textContent.trim();
            
            // Extract details from context
            const dateMatch = contextText.match(/\d{2}\/\d{2}\/\d{2}\s*-\s*\d{2}\/\d{2}\/\d{2}/);
            const priceMatch = contextText.match(/£(\d+)/);
            
            let type = 'Unknown type';
            if (contextText.includes('Full Year')) {
              type = 'Full Year';
            } else if (contextText.includes('Academic Year')) {
              type = 'Academic Year';
            } else if (contextText.includes('Semester')) {
              type = 'Semester';
            }
            
            weekPatterns.push({
              term: weekMatch[0],
              dates: dateMatch ? dateMatch[0] : 'Unknown dates',
              type: type,
              price: priceMatch ? `£${priceMatch[1]}` : 'Unknown price',
              context: contextText.substring(0, 150)
            });
          }
        }
        
        return weekPatterns;
      });
      
      // Remove duplicates
      const uniqueContracts = [];
      const seen = new Set();
      
      for (const contract of contracts) {
        // Create a unique key from term and price
        const key = `${contract.term}-${contract.price}`;
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
          description: 'The bot could not find any contract information. This could mean the system is working differently than expected, or no rooms are currently available.',
          color: 15105570, // Orange/yellow
          url: await page.url()
        });
        
        // Send the screenshot
        await sendScreenshot('/tmp/contract-check.png', 'Current page state');
      } else {
        // Check for non-51-week contracts
        const newContracts = uniqueContracts.filter(contract => 
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
              name: `${contract.term} (${contract.type})`,
              value: `📅 ${contract.dates}\n💰 ${contract.price}`,
              inline: true
            })),
            url: await page.url()
          });
          
          // Send screenshot of the page
          await sendScreenshot('/tmp/contract-check.png', 'Contract options');
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
      await sendScreenshot('/tmp/contract-check.png', 'Error state');
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

// Initial check on startup (with delay)
console.log('Unite Students Contract Checker Bot starting...');
setTimeout(checkForContracts, 10000); // Delay the first check by 10 seconds

// Keep the process alive
process.on('SIGINT', () => {
  console.log('Bot shutting down...');
  process.exit(0);
});

// Prevent crashes
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});
