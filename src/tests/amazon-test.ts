import { chromium, Browser } from 'playwright';
import path from 'path';
import fs from 'fs/promises';
import dotenv from 'dotenv';

// Load environment variables from .env file
const rootDir = path.resolve(process.cwd(), '../..');
dotenv.config({ path: path.resolve(rootDir, '.env') });

async function amazonTest() {
  console.log('Starting Amazon test with BrightData...');
  
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
    const homeFileName = `amazon-home-${Date.now()}.png`;
    const homeFilePath = path.join(screenshotDir, homeFileName);
    console.log(`Taking homepage screenshot and saving to: ${homeFilePath}`);
    await page.screenshot({ path: homeFilePath, fullPage: true });
    console.log(`Homepage screenshot saved: ${homeFilePath}`);
    
    // Wait a bit before navigating to a product
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Try to search for a product
    console.log('Searching for a product...');
    await page.fill('#twotabsearchtextbox', 'wireless earbuds');
    await page.press('#twotabsearchtextbox', 'Enter');
    
    // Wait for search results
    await page.waitForSelector('.s-result-item', { timeout: 30000 });
    console.log('Search results loaded');
    
    // Take screenshot of search results
    const searchFileName = `amazon-search-${Date.now()}.png`;
    const searchFilePath = path.join(screenshotDir, searchFileName);
    console.log(`Taking search results screenshot and saving to: ${searchFilePath}`);
    await page.screenshot({ path: searchFilePath, fullPage: true });
    console.log(`Search results screenshot saved: ${searchFilePath}`);
    
    // Get page title
    const pageTitle = await page.title();
    console.log(`Page title: ${pageTitle}`);
    
    console.log('\n✅ Amazon test completed successfully');
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
amazonTest().catch(error => {
  console.error('Test failed with error:');
  console.error('Error name:', error instanceof Error ? error.name : 'Unknown');
  console.error('Error message:', error instanceof Error ? error.message : String(error));
  console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
  process.exit(1);
}); 