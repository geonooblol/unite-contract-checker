// Unite Students Contract Checker Bot - Optimized Version
// Monitors for non-51-week ensuite contracts at Pier Quays

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
const NAVIGATION_TIMEOUT = 30000; // 30 seconds
const PAGE_TIMEOUT = 60000; // 60 seconds

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
      await hook.send(`**${content.title}**\n${content.description}`);
    } catch (err) {
      console.error('Failed to send even simplified Discord notification:', err.message);
    }
  }
}

// Function to send a screenshot to Discord
async function sendScreenshot(page, description) {
  try {
    const screenshotBuffer = await page.screenshot();
    await hook.sendFile(screenshotBuffer);
    console.log('Screenshot sent to Discord');
  } catch (error) {
    console.error('Failed to send screenshot:', error.message);
  }
}

// Helper function to wait for selectors with timeout
async function waitForSelectorWithTimeout(page, selector, timeout = 5000) {
  try {
    await page.waitForSelector(selector, { visible: true, timeout });
    return true;
  } catch (error) {
    return false;
  }
}

// Helper function for safer clicks
async function safeClick(page, selector, description = "element") {
  try {
    console.log(`Attempting to click ${description}: ${selector}`);
    
    // First check if element exists and is visible
    const elementVisible = await waitForSelectorWithTimeout(page, selector);
    if (!elementVisible) {
      console.log(`${description} not visible or not found: ${selector}`);
      // Try to find by text if selector fails
      const clickedByText = await page.evaluate((desc) => {
        const elements = Array.from(document.querySelectorAll('button, a'));
        const element = elements.find(el => el.textContent.includes(desc));
        if (element) {
          element.click();
          return true;
        }
        return false;
      }, description);
      
      if (clickedByText) {
        console.log(`Clicked ${description} by text content`);
        await page.waitForTimeout(2000);
        return true;
      }
      return false;
    }
    
    // Try direct click
    await page.click(selector);
    console.log(`Clicked ${description}`);
    
    // Wait for the click to have an effect
    await page.waitForTimeout(2000);
    return true;
  } catch (error) {
    console.error(`Failed to click ${description}: ${error.message}`);
    return false;
  }
}

// Main function to check for contracts
async function checkForContracts() {
  console.log(`[${new Date().toISOString()}] Running contract check...`);
  
  let browser = null;
  
  try {
    console.log('Launching browser...');
    
    // Launch browser with minimal resources
    browser = await puppeteer.launch({ 
      headless: true,
      executablePath: '/usr/bin/google-chrome-stable',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--disable-extensions',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    
    // Set modest viewport and timeout
    await page.setViewport({ width: 1024, height: 768 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');
    page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT);
    page.setDefaultTimeout(PAGE_TIMEOUT);
    
    // Block unnecessary resources to speed up loading
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      // Block images, fonts, and other non-essential resources
      if (['image', 'font', 'media', 'stylesheet'].includes(resourceType) ||
          request.url().includes('analytics') || 
          request.url().includes('tracking')) {
        request.abort();
      } else {
        request.continue();
      }
    });

    // Navigate to the property page
    console.log('Navigating to property page...');
    await page.goto(PROPERTY_URL, { waitUntil: 'domcontentloaded' });
    console.log('Page loaded');
    
    // Handle cookie consent if it appears
    try {
      const cookieButton = await page.$('button[id*="cookie"], button:has-text("Accept")');
      if (cookieButton) {
        await cookieButton.click();
        console.log('Clicked cookie consent button');
        await page.waitForTimeout(1000);
      }
    } catch (e) {
      console.log('No cookie banner or error handling it:', e.message);
    }
    
    // Take a screenshot for the Discord message
    await sendScreenshot(page, 'Property page');
    
    // Click the "Find a room" button
    await safeClick(page, 'button[data-event="book_a_room"]', "Find a room button");
    
    // Wait to see if we need to navigate to a different page
    await page.waitForTimeout(3000);
    
    // Check if we need to select Ensuite option
    await safeClick(page, 'button[data-room_type="ENSUITE"], button:has-text("En-suite")', "Ensuite option");
    
    // Wait for contract information to load
    console.log('Waiting for contract information to load...');
    await page.waitForTimeout(5000);
    
    // Take a screenshot of contract info
    await sendScreenshot(page, 'Contract information');
    
    // Extract contract information
    console.log('Extracting contract information...');
    
    // Look for contract term options
    const contracts = await page.evaluate(() => {
      const results = [];
      
      // Try to find pricing options in the reserve section
      const reserveSection = document.querySelector('div.mt-9');
      if (reserveSection) {
        // Find all pricing option containers
        const pricingOptions = reserveSection.querySelectorAll('[role="radio"], div.flex.cursor-pointer');
        
        pricingOptions.forEach(option => {
          const text = option.textContent;
          
          // Extract weeks
          const weekMatch = text.match(/(\d+)\s*weeks/);
          const term = weekMatch ? weekMatch[0] : 'Unknown term';
          
          // Extract dates
          const dateMatch = text.match(/\d{2}\/\d{2}\/\d{2}\s*-\s*\d{2}\/\d{2}\/\d{2}/);
          const dates = dateMatch ? dateMatch[0] : 'Unknown dates';
          
          // Extract type
          let type = 'Unknown type';
          if (text.includes('Full Year')) type = 'Full Year';
          else if (text.includes('Academic Year')) type = 'Academic Year';
          else if (text.includes('Semester')) type = 'Semester';
          
          // Extract price
          const priceMatch = text.match(/£(\d+)/);
          const price = priceMatch ? `£${priceMatch[1]}` : 'Unknown price';
          
          results.push({ term, dates, type, price });
        });
      }
      
      // If no results, try more generic selectors
      if (results.length === 0) {
        // Look for week mentions anywhere in the page
        const weekMatches = document.body.textContent.match(/(\d+)\s*weeks?/gi);
        if (weekMatches) {
          weekMatches.forEach(weekTerm => {
            results.push({
              term: weekTerm,
              dates: 'Found via direct scan',
              type: 'Unknown',
              price: 'Unknown'
            });
          });
        }
      }
      
      return results;
    });
    
    console.log('Extracted contracts:', contracts);
    
    // Process the results
    if (!contracts || contracts.length === 0) {
      console.log('No contract information found.');
      
      await sendDiscordMessage({
        title: '❓ Contract Check - No Details Found',
        description: 'The bot couldn\'t find any contract information. This could mean either no rooms are available or the website structure has changed.',
        color: 15105570, // Orange/yellow
        url: page.url()
      });
    } else {
      // Check for non-51-week contracts
      const newContracts = contracts.filter(contract => 
        contract.term && 
        !contract.term.includes('51')
      );
      
      if (newContracts.length > 0) {
        console.log('New contract options found!');
        
        // Send notification with details
        await sendDiscordMessage({
          title: '🎉 New Contract Options Available!',
          description: 'Non-standard contract options have been found for ensuite rooms at Pier Quays!',
          color: 5814783, // Green
          fields: newContracts.map(contract => ({
            name: contract.term,
            value: `📅 ${contract.dates}\n💰 ${contract.price}\n📋 ${contract.type}`,
            inline: true
          })),
          url: page.url()
        });
      } else {
        console.log('Only standard 51-week contracts found.');
        
        // Optional status update if environment variable is set
        if (process.env.SEND_STATUS_UPDATES === 'true') {
          await sendDiscordMessage({
            title: 'Contract Check Completed',
            description: 'Only standard 51-week contracts are currently available.',
            color: 10197915, // Blue
            url: page.url()
          });
        }
      }
    }
    
  } catch (error) {
    console.error('Error during check:', error);
    
    // Send error notification
    await sendDiscordMessage({
      title: '❌ Bot Error',
      description: `The bot encountered an error:\n\`\`\`${error.message}\`\`\``,
      color: 15158332, // Red
    });
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

// Initial check on startup
console.log('Unite Students Contract Checker Bot starting...');
setTimeout(checkForContracts, 15000); // Delay the first check by 15 seconds

// Keep the process alive
process.on('SIGINT', () => {
  console.log('Bot shutting down...');
  process.exit(0);
});

// Prevent crashes
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});
