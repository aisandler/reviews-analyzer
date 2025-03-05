import { chromium, Browser } from 'playwright';
import path from 'path';
import fs from 'fs/promises';
import dotenv from 'dotenv';

// Load environment variables from .env file
const rootDir = path.resolve(process.cwd(), '../..');
dotenv.config({ path: path.resolve(rootDir, '.env') });

async function simpleScreenshotTest() {
  console.log('Starting simple screenshot test with BrightData...');
  
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
  
  // Different product IDs to try
  const productIds = [
    'B09B9TB61Y', // iPhone charger
    'B07ZPKN6YR', // Echo Dot
    'B07PVCVBN7', // Fire TV Stick
    'B08DFPV5HL', // Echo Show
    'B07NQRP7CC'  // AirPods Pro
  ];
  
  // Random product selection
  const productId = productIds[Math.floor(Math.random() * productIds.length)];
  console.log(`Selected product ID: ${productId}`);
  
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
    
    // Direct navigation to Amazon product page
    console.log(`Navigating to Amazon product page for ID: ${productId}...`);
    await page.goto(`https://www.amazon.com/dp/${productId}`, {
      timeout: 60000,
      waitUntil: 'networkidle'
    });
    
    console.log('Navigation completed');
    
    // Take screenshot
    const fileName = `amazon-product-${productId}-${Date.now()}.png`;
    const filePath = path.join(screenshotDir, fileName);
    console.log(`Taking screenshot and saving to: ${filePath}`);
    await page.screenshot({ path: filePath, fullPage: true });
    console.log(`Screenshot saved: ${filePath}`);
    
    // Get page title
    const pageTitle = await page.title();
    console.log(`Page title: ${pageTitle}`);
    
    console.log('\n✅ Simple screenshot test completed');
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
simpleScreenshotTest().catch(error => {
  console.error('Test failed with error:');
  console.error('Error name:', error instanceof Error ? error.name : 'Unknown');
  console.error('Error message:', error instanceof Error ? error.message : String(error));
  console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
  process.exit(1);
}); 