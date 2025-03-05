import { chromium, Browser } from 'playwright';
import path from 'path';
import fs from 'fs/promises';
import dotenv from 'dotenv';

// Load environment variables from .env file
const rootDir = path.resolve(process.cwd(), '../..');
dotenv.config({ path: path.resolve(rootDir, '.env') });

async function amazonProductTest() {
  console.log('Starting Amazon product test with BrightData...');
  
  const wsEndpoint = process.env.BRIGHTDATA_WS_ENDPOINT;
  if (!wsEndpoint) {
    throw new Error('BRIGHTDATA_WS_ENDPOINT environment variable is required');
  }
  console.log('Using WebSocket endpoint:', wsEndpoint);
  
  // Create screenshot directory
  const screenshotDir = path.join(process.cwd(), '../../screenshots');
  const productDir = path.join(screenshotDir, 'products');
  console.log('Creating screenshot directories...');
  await fs.mkdir(screenshotDir, { recursive: true });
  await fs.mkdir(productDir, { recursive: true });
  console.log('Screenshot directories created successfully');
  
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
    
    // Wait a bit before searching
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Try to search for a product
    console.log('Searching for a product...');
    await page.fill('#twotabsearchtextbox', 'wireless earbuds');
    await page.press('#twotabsearchtextbox', 'Enter');
    
    // Wait for search results
    await page.waitForSelector('.s-result-item', { timeout: 30000 });
    console.log('Search results loaded');
    
    // Wait a bit before clicking on a product
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Click on the first product
    console.log('Clicking on the first product...');
    const firstProductSelector = '.s-result-item h2 a';
    await page.waitForSelector(firstProductSelector, { timeout: 30000 });
    
    // Get the product title before clicking
    const productTitle = await page.evaluate((selector) => {
      const element = document.querySelector(selector);
      return element ? element.textContent?.trim() : 'Title not found';
    }, firstProductSelector);
    
    console.log(`Selected product: ${productTitle}`);
    
    // Click on the product
    await page.click(firstProductSelector);
    
    // Wait for product page to load
    await page.waitForLoadState('networkidle', { timeout: 60000 });
    console.log('Product page loaded');
    
    // Take screenshot of product page
    const productFileName = `product-page-${Date.now()}.png`;
    const productFilePath = path.join(productDir, productFileName);
    console.log(`Taking product page screenshot and saving to: ${productFilePath}`);
    await page.screenshot({ path: productFilePath, fullPage: true });
    console.log(`Product page screenshot saved: ${productFilePath}`);
    
    // Get page title
    const pageTitle = await page.title();
    console.log(`Page title: ${pageTitle}`);
    
    // Check if we're on a product page
    const isProductPage = await page.evaluate(() => {
      return !!document.querySelector('#productTitle') || 
             !!document.querySelector('.product-title') ||
             !!document.querySelector('.a-box-inner');
    });
    
    if (isProductPage) {
      console.log('Successfully loaded product page!');
      
      // Try to get product title
      const productPageTitle = await page.evaluate(() => {
        const titleElement = document.querySelector('#productTitle');
        return titleElement ? titleElement.textContent?.trim() : 'Title not found';
      });
      
      console.log(`Product title on page: ${productPageTitle}`);
    } else {
      console.log('Failed to load product page - likely detected as bot');
    }
    
    console.log('\n✅ Amazon product test completed successfully');
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
amazonProductTest().catch(error => {
  console.error('Test failed with error:');
  console.error('Error name:', error instanceof Error ? error.name : 'Unknown');
  console.error('Error message:', error instanceof Error ? error.message : String(error));
  console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
  process.exit(1);
}); 