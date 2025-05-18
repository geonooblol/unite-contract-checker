// Unite Students Contract Checker Bot - Enhanced Version
// Monitors for non-51-week ensuite contracts at Pier Quays
// More robust selectors and navigation handling

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
const NAVIGATION_TIMEOUT = 60000; // 60 seconds
const PAGE_TIMEOUT = 90000; // 90 seconds

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

// Helper function to wait for selectors with timeout
async function waitForSelectorWithTimeout(page, selector, timeout = 10000) {
  try {
    await page.waitForSelector(selector, { visible: true, timeout });
    return true;
  } catch (error) {
    console.log(`Selector not found within timeout: ${selector}`);
    return false;
  }
}

// Enhanced click function that tries multiple approaches
async function enhancedClick(page, selectors, textContent, description = "element") {
  // Try each provided selector
  for (const selector of Array.isArray(selectors) ? selectors : [selectors]) {
    try {
      console.log(`Attempting to click ${description} using selector: ${selector}`);
      const elementVisible = await waitForSelectorWithTimeout(page, selector);
      if (elementVisible) {
        await page.click(selector);
        console.log(`Successfully clicked ${description} using: ${selector}`);
        await page.waitForTimeout(3000);
        return true;
      }
    } catch (e) {
      console.log(`Failed to click ${description} using selector: ${selector}`);
    }
  }

  // Try clicking by text content if provided
  if (textContent) {
    try {
      console.log(`Attempting to click ${description} by text content: "${textContent}"`);
      
      const clicked = await page.evaluate((text) => {
        // Look for elements containing the text
        const elements = Array.from(document.querySelectorAll('button, a, div[role="button"], [class*="button"]'));
        let targetElement = null;
        
        // First try exact text match
        targetElement = elements.find(el => el.textContent.trim() === text);
        
        // If not found, try contains
        if (!targetElement) {
          targetElement = elements.find(el => el.textContent.includes(text));
        }
        
        if (targetElement) {
          targetElement.click();
          return true;
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

  // Last resort - try to find any interactive element with a keyword
  if (description.includes(" ")) {
    const keywords = description.split(" ");
    try {
      console.log(`Trying keywords from description: ${keywords.join(", ")}`);
      
      const clicked = await page.evaluate((keywords) => {
        const elements = Array.from(document.querySelectorAll('button, a, div[role="button"], [class*="button"]'));
        
        // Find elements containing any of our keywords
        for (const keyword of keywords) {
          if (keyword.length < 3) continue; // Skip short words
          const found = elements.find(el => el.textContent.toLowerCase().includes(keyword.toLowerCase()));
          if (found) {
            found.click();
            return `Clicked element containing "${keyword}"`;
          }
        }
        return false;
      }, keywords);
      
      if (clicked) {
        console.log(clicked);
        await page.waitForTimeout(3000);
        return true;
      }
    } catch (e) {
      console.log(`Keyword search failed: ${e.message}`);
    }
  }

  console.log(`Could not click ${description} using any method`);
  return false;
}

// Main function to check for contracts
async function checkForContracts() {
  console.log(`[${new Date().toISOString()}] Running contract check...`);
  
  let browser = null;
  let page = null;
  
  try {
    console.log('Launching browser...');
    
    // Launch browser with minimal resources
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
        '--disable-gpu',
        '--window-size=1280,920'
      ]
    });
    
    page = await browser.newPage();
    
    // Set viewport and user agent
    await page.setViewport({ width: 1280, height: 920 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');
    page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT);
    page.setDefaultTimeout(PAGE_TIMEOUT);
    
    // Only block certain resources to ensure page functionality
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      const url = request.url().toLowerCase();
      
      // Block analytics, tracking, and some media but allow CSS and basic images
      if (
        ['media'].includes(resourceType) ||
        url.includes('analytics') || 
        url.includes('tracking') ||
        url.includes('google-analytics') ||
        url.includes('facebook.com') ||
        url.includes('hotjar')
      ) {
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
      // Various common cookie consent selectors
      const cookieSelectors = [
        'button[id*="cookie"]', 
        'button:has-text("Accept")',
        'button:has-text("Accept All")',
        'button:has-text("Allow")',
        'button.cookie-consent',
        '[aria-label="Accept cookies"]'
      ];
      
      for (const selector of cookieSelectors) {
        const cookieBtn = await page.$(selector);
        if (cookieBtn) {
          await cookieBtn.click();
          console.log(`Clicked cookie consent button: ${selector}`);
          await page.waitForTimeout(1500);
          break;
        }
      }
    } catch (e) {
      console.log('No cookie banner or error handling it:', e.message);
    }
    
    // Save a debug log of the page content to help with debugging
    const pageContent = await page.content();
    console.log('Current page URL:', page.url());
    
    // Find and click on the "Find a room" button - multiple possible selectors
    const findRoomSuccess = await enhancedClick(
      page,
      [
        'button[data-event="book_a_room"]',
        'button[data-cy="button"]:has-text("Find a room")',
        'a:has-text("Find a room")',
        'button:has-text("Find a room")',
        '[data-event="book_a_room"]'
      ],
      'Find a room',
      'Find a room button'
    );
    
    if (!findRoomSuccess) {
      console.log('Failed to click Find a room button, trying to continue anyway...');
    }
    
    // Wait for the next page to load
    await page.waitForTimeout(5000);
    console.log('Current URL after Find Room:', page.url());
    
    // Click on the Ensuite option - enhanced approach with multiple selectors
    const ensuiteSuccess = await enhancedClick(
      page,
      [
        'button[data-room_type="ENSUITE"]',
        'button:has-text("En-suite")',
        'div:has-text("En-suite"):has([role="radio"])',
        '#room-option-card:has-text("En-suite")',
        '[aria-label="Select ENSUITE"]'
      ],
      'En-suite',
      'Ensuite option'
    );
    
    if (!ensuiteSuccess) {
      console.log('Failed to click Ensuite option, trying to continue...');
      
      // See if we're already at room selection by looking for "Reserve your room"
      const reserveVisible = await waitForSelectorWithTimeout(page, 'div:has-text("Reserve your room")');
      if (!reserveVisible) {
        console.log('Could not find reservation section either');
        
        // If we can't find either, try to detect where we are
        const currentState = await page.evaluate(() => {
          if (document.body.textContent.includes('Reserve your room')) return 'reservation';
          if (document.body.textContent.includes('Rooms available')) return 'property';
          if (document.body.textContent.includes('En-suite') || document.body.textContent.includes('Studio')) return 'room-selection';
          return 'unknown';
        });
        
        console.log(`Current page state detected as: ${currentState}`);
      }
    }
    
    // Wait for contract information to load
    console.log('Waiting for contract information to load...');
    await page.waitForTimeout(5000);
    
    // Debug info - get URL and page title
    const currentUrl = page.url();
    const title = await page.title();
    console.log(`Current page: ${title} | URL: ${currentUrl}`);
    
    // Enhanced contract extraction - multiple approaches
    console.log('Extracting contract information...');
    
    // Approach 1: Look specifically for the "Reserve your room" section
    const contracts = await page.evaluate(() => {
      const results = [];
      
      // Multiple approaches to find contract information
      function findContractTerms() {
        // Approach 1: Look for pricing options in the Reserve section
        const reserveSection = document.querySelector('div.mt-9, div:has(> span:contains("Reserve your room"))');
        if (reserveSection) {
          const pricingOptions = reserveSection.querySelectorAll('[role="radio"], div.flex.cursor-pointer, div.flex:has(span:contains("weeks"))');
          
          if (pricingOptions && pricingOptions.length > 0) {
            pricingOptions.forEach(option => {
              const text = option.textContent || '';
              
              // Extract weeks
              const weekMatch = text.match(/(\d+)\s*weeks?/i);
              const term = weekMatch ? weekMatch[0] : 'Unknown term';
              
              // Extract dates
              const dateMatch = text.match(/\d{2}\/\d{2}\/\d{2}\s*-\s*\d{2}\/\d{2}\/\d{2}/);
              const dates = dateMatch ? dateMatch[0] : 'Unknown dates';
              
              // Extract type
              let type = 'Unknown type';
              if (text.toLowerCase().includes('full year')) type = 'Full Year';
              else if (text.toLowerCase().includes('academic year')) type = 'Academic Year';
              else if (text.toLowerCase().includes('semester')) type = 'Semester';
              
              // Extract price
              const priceMatch = text.match(/£(\d+)/);
              const price = priceMatch ? `£${priceMatch[1]}` : 'Unknown price';
              
              results.push({ term, dates, type, price });
            });
          }
          return results.length > 0;
        }
        return false;
      }
      
      // Try the main approach
      if (!findContractTerms()) {
        // Fallback: Look for any pricing information on the page
        const pricingTexts = [];
        const priceElements = document.querySelectorAll('div:has(span:contains("£")), div:has(span:contains("week"))');
        
        priceElements.forEach(el => {
          const text = el.textContent.trim();
          if (text.includes('£') && text.includes('week')) {
            pricingTexts.push(text);
          }
        });
        
        // Extract contract info from the collected texts
        pricingTexts.forEach(text => {
          // Extract weeks
          const weekMatch = text.match(/(\d+)\s*weeks?/i);
          const term = weekMatch ? weekMatch[0] : 'Unknown term';
          
          // Extract dates
          const dateMatch = text.match(/\d{2}\/\d{2}\/\d{2}\s*-\s*\d{2}\/\d{2}\/\d{2}/);
          const dates = dateMatch ? dateMatch[0] : 'Unknown dates';
          
          // Extract price
          const priceMatch = text.match(/£(\d+)/);
          const price = priceMatch ? `£${priceMatch[1]}` : 'Unknown price';
          
          results.push({ term, dates, type: 'Unknown type', price });
        });
      }
      
      // Last resort: Look for week mentions anywhere in the page
      if (results.length === 0) {
        const weekMatches = document.body.textContent.match(/(\d+)\s*weeks?/gi);
        if (weekMatches) {
          const uniqueTerms = [...new Set(weekMatches)];
          uniqueTerms.forEach(weekTerm => {
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
    
    // Get page state information to help with debugging
    const pageState = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        hasReserveSection: document.body.textContent.includes('Reserve your room'),
        hasWeekMentions: document.body.textContent.match(/(\d+)\s*weeks?/gi) || [],
        hasPriceMentions: document.body.textContent.match(/£(\d+)/gi) || []
      };
    });
    
    console.log('Page state:', pageState);
    
    // Process the results
    if (!contracts || contracts.length === 0) {
      console.log('No contract information found.');
      
      await sendDiscordMessage({
        title: '❓ Contract Check - No Details Found',
        description: `The bot couldn't find any contract information. This could mean either:\n• No rooms are available\n• The website structure has changed\n• Bot needs navigation improvements\n\nCurrent page: ${pageState.title}\nURL: ${pageState.url}`,
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
    
    // More detailed error reporting
    let errorDetails = `Error: ${error.message}`;
    
    // Add page info if available
    if (page) {
      try {
        errorDetails += `\nCurrent URL: ${page.url()}`;
        const title = await page.title().catch(() => 'Unknown');
        errorDetails += `\nPage title: ${title}`;
        
        // Get HTML snippet where error might have occurred
        const bodyContent = await page.evaluate(() => {
          return document.body ? document.body.innerText.substring(0, 500) + '...' : 'No body content';
        }).catch(() => 'Could not extract body content');
        
        errorDetails += `\nPage content snippet: ${bodyContent}`;
      } catch (e) {
        errorDetails += `\nError getting page details: ${e.message}`;
      }
    }
    
    // Send error notification
    await sendDiscordMessage({
      title: '❌ Bot Error',
      description: `The bot encountered an error:\n\`\`\`${errorDetails}\`\`\``,
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

// Simple health check endpoint for Railway/Render
if (process.env.ENABLE_HEALTH_CHECK === 'true') {
  const http = require('http');
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running');
  });
  
  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`Health check server running on port ${port}`);
  });
}

// Schedule the check
cron.schedule(CHECK_INTERVAL, checkForContracts, {
  scheduled: true,
  timezone: 'Europe/London' // Set to UK timezone
});

// Initial check on startup with a slight delay
const startupDelay = Math.floor(Math.random() * 30000) + 15000; // 15-45 seconds
console.log(`Unite Students Contract Checker Bot starting in ${startupDelay/1000} seconds...`);
setTimeout(checkForContracts, startupDelay);

// Keep the process alive
process.on('SIGINT', () => {
  console.log('Bot shutting down...');
  process.exit(0);
});

// Prevent crashes
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});
