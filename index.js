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
const hook = new Webhook(WEBHOOK_URL);

// Configuration
const CHECK_INTERVAL = process.env.CHECK_INTERVAL || '0 */4 * * *'; // Every 4 hours by default
const PROPERTY_URL = 'https://www.unitestudents.com/student-accommodation/medway/pier-quays';
const DEFAULT_CONTRACT = '51 weeks'; // The contract we want to avoid

async function checkForContracts() {
  console.log(`[${new Date().toISOString()}] Running contract check...`);
  
  // Launch browser with stealth mode to avoid detection
  const browser = await puppeteer.launch({ 
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--single-process'
    ]
  });
  
  try {
    const page = await browser.newPage();
    
    // Set a realistic viewport
    await page.setViewport({ width: 1366, height: 768 });
    
    // Add random delay between actions to seem more human-like
    const randomDelay = () => new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // Navigate to the property page
    console.log('Navigating to property page...');
    await page.goto(PROPERTY_URL, { waitUntil: 'networkidle2' });
    await randomDelay();
    
    // Accept cookies if the banner appears
    try {
      const cookieSelector = 'button[data-cy="cookie-accept-all"]';
      const cookieButton = await page.$(cookieSelector);
      if (cookieButton) {
        await cookieButton.click();
        await page.waitForTimeout(1000);
      }
    } catch (e) {
      console.log('No cookie banner found or unable to click it');
    }
    
    // Find and click "Find a room" button
    console.log('Looking for "Find a room" button...');
    await page.waitForSelector('button[data-event="book_a_room"]');
    await page.click('button[data-event="book_a_room"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    await randomDelay();
    
    // Select the ENSUITE option
    console.log('Selecting ensuite room option...');
    await page.waitForSelector('button[data-event="select_room_type"][data-room_type="ENSUITE"]');
    await page.click('button[data-event="select_room_type"][data-room_type="ENSUITE"]');
    await randomDelay();
    
    // Wait for the "Reserve your room" section to load
    console.log('Waiting for contract information to load...');
    await page.waitForSelector('div.mt-9 span.px-4.font-lato.text-xl.font-bold');
    
    // Extract all contract options
    const contracts = await page.evaluate(() => {
      const contractDivs = document.querySelectorAll('#pricing-option');
      return Array.from(contractDivs).map(div => {
        const termText = div.querySelector('.font-lato.text-md.font-bold.leading-120')?.textContent.trim();
        const dateRange = div.querySelector('.font-open-sans.text-xs.leading-150')?.textContent.trim();
        const contractType = div.querySelector('.font-open-sans.text-2xs.font-normal.leading-150')?.textContent.trim();
        const priceText = div.querySelector('.font-open-sans.text-md.font-semibold.leading-150')?.textContent.trim();
        
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
      await hook.send({
        username: 'Unite Students Contract Alert',
        avatarURL: 'https://www.unitestudents.com/favicon.ico',
        embeds: [{
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
        }]
      });
    } else {
      console.log('No new contract options found. Still only 51-week contracts available.');
    }
  } catch (error) {
    console.error('Error during check:', error);
    
    // Send error notification to Discord
    await hook.send({
      username: 'Unite Students Contract Alert',
      avatarURL: 'https://www.unitestudents.com/favicon.ico',
      embeds: [{
        title: '❌ Error Checking Contracts',
        description: `The bot encountered an error while checking for new contracts:\n\`\`\`${error.message}\`\`\``,
        color: 15158332, // Red color
        footer: {
          text: `Error occurred at ${new Date().toLocaleString()}`
        }
      }]
    });
  } finally {
    await browser.close();
  }
}

// Schedule the check based on cron expression
cron.schedule(CHECK_INTERVAL, checkForContracts, {
  scheduled: true,
  timezone: 'Europe/London' // Set to UK timezone
});

// Initial check on startup
console.log('Unite Students Contract Checker Bot starting...');
checkForContracts();

// Keep the process alive
process.on('SIGINT', () => {
  console.log('Bot shutting down...');
  process.exit(0);
});

// Prevent the app from crashing on unhandled exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});
