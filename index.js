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
      const cookieSelector = 'button[data-cy="cookie-accept-all"]';
      const cookieButton = await page.$(cookieSelector);
      if (cookieButton) {
        console.log('Cookie banner found, accepting...');
        await cookieButton.click();
        await page.waitForTimeout(2000);
      }
    } catch (e) {
      console.log('No cookie banner found or unable to click it');
    }
    
    // Debug: Log the current URL
    console.log('Current URL:', await page.url());
    
    // Find and click "Find a room" button
    console.log('Looking for "Find a room" button...');
    
    try {
      // Wait for the button to be visible and clickable
      await page.waitForSelector('button[data-event="book_a_room"]', { visible: true, timeout: 60000 });
      
      // Take a screenshot before clicking
      await page.screenshot({ path: '/tmp/before-find-room.png' });
      console.log('Screenshot before Find a Room click saved');
      
      // Click and wait WITHOUT using waitForNavigation (which can be flaky)
      await Promise.all([
        page.click('button[data-event="book_a_room"]'),
        page.waitForTimeout(5000) // Give it time to start navigation
      ]);
      
      // Wait for the page to settle after clicking
      console.log('Waiting for page to load after clicking Find a Room...');
      await page.waitForTimeout(10000);
      
      // Take a screenshot after clicking
      await page.screenshot({ path: '/tmp/after-find-room.png' });
      console.log('Screenshot after Find a Room click saved');
      
    } catch (error) {
      console.error('Error finding or clicking the Find a Room button:', error.message);
      
      // Take error screenshot
      await page.screenshot({ path: '/tmp/error-find-room.png' });
      console.log('Error screenshot saved');
      
      // Try to find it in a different way if the first method failed
      console.log('Trying alternative method to find the button...');
      const buttonElements = await page.$$('button');
      
      for (const button of buttonElements) {
        const text = await page.evaluate(el => el.textContent, button);
        if (text && text.includes('Find a room')) {
          console.log('Found button with text "Find a room", clicking...');
          await button.click();
          await page.waitForTimeout(10000); // Wait for navigation
          break;
        }
      }
    }
    
    // Debug: Get the current URL
    console.log('Current URL after Find a Room:', await page.url());
    
    // Select the ENSUITE option
    console.log('Looking for ensuite room option...');
    
    try {
      // Wait for ENSUITE button to be visible
      await page.waitForSelector('button[data-event="select_room_type"][data-room_type="ENSUITE"]', { 
        visible: true,
        timeout: 60000 
      });
      
      console.log('ENSUITE option found, clicking...');
      
      // Click the ENSUITE button
      await page.click('button[data-event="select_room_type"][data-room_type="ENSUITE"]');
      await page.waitForTimeout(8000); // Wait for any content to load
      
      // Take screenshot after selecting ensuite
      await page.screenshot({ path: '/tmp/after-ensuite.png' });
      console.log('Screenshot after ENSUITE selection saved');
      
    } catch (error) {
      console.error('Error finding or clicking ENSUITE option:', error.message);
      
      // Take error screenshot
      await page.screenshot({ path: '/tmp/error-ensuite.png' });
      console.log('Error screenshot saved');
      
      // Try by text content if data attribute method failed
      try {
        console.log('Trying alternative method to find ENSUITE option...');
        const ensuiteText = await page.$x("//button[contains(., 'En-suite')]");
        
        if (ensuiteText.length > 0) {
          console.log('Found ENSUITE button via text content, clicking...');
          await ensuiteText[0].click();
          await page.waitForTimeout(8000);
        }
      } catch (xpathError) {
        console.error('Failed alternative method:', xpathError.message);
      }
    }
    
    // Debug: Get the current URL
    console.log('Current URL after selecting ENSUITE:', await page.url());
    
    // Wait for the "Reserve your room" section to load
    console.log('Waiting for contract information to load...');
    try {
      await page.waitForSelector('div.mt-9 span.px-4.font-lato.text-xl.font-bold', { 
        visible: true,
        timeout: 60000 
      });
      
      console.log('Contract information section found!');
      
      // Take screenshot of contract info
      await page.screenshot({ path: '/tmp/contract-info.png' });
      console.log('Contract information screenshot saved');
      
      // Extract all contract options
      const contracts = await page.evaluate(() => {
        const contractDivs = document.querySelectorAll('#pricing-option');
        if (!contractDivs || contractDivs.length === 0) {
          console.log('No contract options found in the page');
          return [];
        }
        
        return Array.from(contractDivs).map(div => {
          const termText = div.querySelector('.font-lato.text-md.font-bold.leading-120')?.textContent?.trim() || 'Unknown term';
          const dateRange = div.querySelector('.font-open-sans.text-xs.leading-150')?.textContent?.trim() || 'Unknown dates';
          const contractType = div.querySelector('.font-open-sans.text-2xs.font-normal.leading-150')?.textContent?.trim() || 'Unknown type';
          const priceText = div.querySelector('.font-open-sans.text-md.font-semibold.leading-150')?.textContent?.trim() || 'Unknown price';
          
          return {
            term: termText,
            dates: dateRange,
            type: contractType,
            price: priceText
          };
        });
      });
      
      console.log(`Found ${contracts.length} contract options:`, contracts);
      
      // Check if any non-51-week contracts exist
      const newContracts = contracts.filter(contract => contract.term !== DEFAULT_CONTRACT);
      
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
      }
    } catch (error) {
      console.error('Error checking contract information:', error.message);
      
      // Take error screenshot
      await page.screenshot({ path: '/tmp/error-contracts.png' });
      console.log('Error contract section screenshot saved');
      
      throw new Error(`Failed to find contract information: ${error.message}`);
    }
  } catch (error) {
    console.error('Error during check:', error);
    
    // Send error notification to Discord
    try {
      await sendDiscordMessage(`❌ **Error checking contracts**: ${error.message}`);
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
