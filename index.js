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
    
    // Launch browser with minimal resources - UPDATED to use system Chrome
    browser = await puppeteer.launch({ 
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable',
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
    
    const page = await brow
