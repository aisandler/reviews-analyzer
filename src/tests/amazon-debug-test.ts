import { chromium, Browser } from 'playwright';
import path from 'path';
import fs from 'fs/promises';
import dotenv from 'dotenv';

// Load environment variables from .env file
const rootDir = path.resolve(process.cwd(), '../..');
dotenv.config({ path: path.resolve(rootDir, '.env') });

async function amazonDebugTest() {
  console.log('Starting Amazon debug test with BrightData...');
  
  const wsEndpoint = process.env.BRIGHTDATA_WS_ENDPOINT;
  if (!wsEndpoint) {
    throw new Error('BRIGHTDATA_WS_ENDPOINT environment variable is required');
  }
  console.log('Using WebSocket endpoint:', wsEndpoint);
  
  // Create screenshot directory
  const screenshotDir = path.join(process.cwd(), '../../screenshots');
  console.log('Creating screenshot directory...');
  await fs.mkdir(screenshotDir, { recursive: true });
  console.log('Screenshot directory created successfully');
  
  let browser: Browser | null = null;
  
  try {
    console.log('Connecting to BrightData Scraping Browser...');
    browser = await chromium.connectOverCDP(wsEndpoint, {
      timeout: 60000,
      headers: {
        'User-Agent': 'Playwright'
      }
    });
    
    console.log('Creating new page...');
    const page = await browser.newPage();
    
    // First navigate to Amazon homepage
    console.log('Navigating to Amazon homepage...');
    await page.goto('https://www.amazon.com', {
      timeout: 30000,
      waitUntil: 'networkidle'
    });
    
    console.log('Navigation to homepage completed');
    
    // Take screenshot of homepage
    const homeFileName = `amazon-debug-${Date.now()}.png`;
    const homeFilePath = path.join(screenshotDir, homeFileName);
    console.log(`Taking homepage screenshot and saving to: ${homeFilePath}`);
    await page.screenshot({ path: homeFilePath, fullPage: true });
    console.log(`Homepage screenshot saved: ${homeFilePath}`);
    
    // Check for search box
    console.log('Checking for search box...');
    const searchBoxExists = await page.evaluate(() => {
      return !!document.querySelector('#twotabsearchtextbox');
    });
    
    console.log(`Search box exists: ${searchBoxExists}`);
    
    if (searchBoxExists) {
      console.log('Search box found!');
    } else {
      console.log('Search box not found. Checking for other elements...');
      
      // Check for other common elements
      const elements = await page.evaluate(() => {
        const results = {
          body: !!document.querySelector('body'),
          header: !!document.querySelector('header'),
          nav: !!document.querySelector('nav'),
          searchForm: !!document.querySelector('form[role="search"]'),
          searchInput: !!document.querySelector('input[type="text"]'),
          logo: !!document.querySelector('.nav-logo-link'),
          captcha: !!document.querySelector('#captchacharacters'),
          robot: !!document.querySelector('form[action="/errors/validateCaptcha"]')
        };
        
        // Get all input elements
        const inputs = Array.from(document.querySelectorAll('input')).map(input => ({
          id: input.id,
          name: input.name,
          type: input.type,
          placeholder: input.placeholder
        }));
        
        return { results, inputs };
      });
      
      console.log('Page elements:', elements.results);
      console.log('Input elements:', elements.inputs);
      
      // Check if we're on a captcha page
      const isCaptchaPage = await page.evaluate(() => {
        return document.body.textContent?.includes('robot') || 
               document.body.textContent?.includes('captcha') ||
               document.body.textContent?.includes('verify');
      });
      
      if (isCaptchaPage) {
        console.log('CAPTCHA detected! We are being blocked.');
      }
    }
    
    // Get page title
    const pageTitle = await page.title();
    console.log(`Page title: ${pageTitle}`);
    
    console.log('\n✅ Amazon debug test completed');
  } catch (error) {
    console.log('❌ Test failed with error:');
    console.log('Error name:', error instanceof Error ? error.name : 'Unknown');
    console.log('Error message:', error instanceof Error ? error.message : String(error));
    console.log('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
  } finally {
    if (browser) await browser.close();
  }
}

// Run the test
amazonDebugTest().catch(error => {
  console.error('Test failed with error:');
  console.error('Error name:', error instanceof Error ? error.name : 'Unknown');
  console.error('Error message:', error instanceof Error ? error.message : String(error));
  console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
  process.exit(1);
}); 