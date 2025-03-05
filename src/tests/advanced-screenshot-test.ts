import { chromium, Browser, Page } from 'playwright';
import path from 'path';
import fs from 'fs/promises';
import dotenv from 'dotenv';

// Load environment variables from .env file
console.log('Current working directory:', process.cwd());
const rootDir = path.resolve(process.cwd(), '../..');
console.log('Root directory:', rootDir);
const result = dotenv.config({ path: path.resolve(rootDir, '.env') });
if (result.error) {
  console.error('Error loading .env file:', result.error);
} else {
  console.log('.env file loaded successfully');
}

// Debug: Print all environment variables
console.log('Environment variables:');
console.log('BRIGHTDATA_WS_ENDPOINT:', process.env.BRIGHTDATA_WS_ENDPOINT);

async function advancedScreenshotTest() {
  console.log('Starting advanced screenshot test with BrightData...');
  
  const wsEndpoint = process.env.BRIGHTDATA_WS_ENDPOINT;
  if (!wsEndpoint) {
    throw new Error('BRIGHTDATA_WS_ENDPOINT environment variable is required');
  }
  console.log('Using WebSocket endpoint:', wsEndpoint);
  
  // Create screenshot directory and subdirectories
  const screenshotDir = path.join(process.cwd(), 'screenshots');
  const productDir = path.join(screenshotDir, 'products');
  const reviewsDir = path.join(screenshotDir, 'reviews');
  const errorsDir = path.join(screenshotDir, 'errors');
  
  console.log('Creating screenshot directories...');
  await fs.mkdir(screenshotDir, { recursive: true });
  await fs.mkdir(productDir, { recursive: true });
  await fs.mkdir(reviewsDir, { recursive: true });
  await fs.mkdir(errorsDir, { recursive: true });
  console.log('Screenshot directories created successfully');
  
  // Random viewport and user agent to avoid detection
  const viewports = [
    { width: 1920, height: 1080 },
    { width: 1440, height: 900 },
    { width: 1366, height: 768 }
  ];
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
  ];
  
  // Test 1: Screenshot of product page
  console.log('\nTest 1: Capturing product page screenshot');
  let browser = null;
  try {
    console.log('Connecting to BrightData Scraping Browser...');
    console.log('Connection timeout set to 30 seconds');
    browser = await chromium.connectOverCDP(wsEndpoint, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Playwright'
      }
    });
    
    const viewport = viewports[Math.floor(Math.random() * viewports.length)];
    const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    
    console.log('Creating new page with stealth settings...');
    console.log(`Viewport: ${viewport.width}x${viewport.height}`);
    console.log(`User Agent: ${userAgent}`);
    
    // Create context with stealth settings
    const context = await browser.newContext({
      viewport,
      userAgent,
      locale: 'en-US',
      timezoneId: 'America/New_York',
      geolocation: { longitude: -73.935242, latitude: 40.730610 }, // New York
      permissions: ['geolocation'],
      bypassCSP: true,
      ignoreHTTPSErrors: true,
    });
    
    const page = await context.newPage();
    
    console.log('Navigating to Amazon product page...');
    await page.goto('https://www.amazon.com/dp/B07HG5KSBS', {
      timeout: 60000,
      waitUntil: 'networkidle'
    });
    console.log('Navigation completed successfully');
    
    const productFileName = `product-page-${Date.now()}.png`;
    const productFilePath = path.join(productDir, productFileName);
    console.log(`Taking screenshot and saving to: ${productFilePath}`);
    await page.screenshot({ path: productFilePath, fullPage: true });
    console.log(`Screenshot saved: ${productFilePath}`);
    
    // Test 2: Screenshot of specific element (product title)
    console.log('\nTest 2: Capturing specific element screenshot');
    console.log('Searching for product title element...');
    const titleElement = await page.$('#productTitle');
    if (titleElement) {
      console.log('Product title element found');
      const elementFileName = `product-title-${Date.now()}.png`;
      const elementFilePath = path.join(productDir, elementFileName);
      console.log(`Taking element screenshot and saving to: ${elementFilePath}`);
      await titleElement.screenshot({ path: elementFilePath });
      console.log(`Element screenshot saved: ${elementFilePath}`);
    } else {
      console.log('Product title element not found');
    }
    
    await browser.close();
  } catch (error) {
    console.log('❌ Test 1 failed with error:');
    console.log('Error name:', error instanceof Error ? error.name : 'Unknown');
    console.log('Error message:', error instanceof Error ? error.message : String(error));
    console.log('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
    if (browser) await browser.close();
  }
  
  // Test 3: Screenshot of reviews page
  console.log('\nTest 3: Capturing reviews page screenshot');
  browser = null;
  try {
    console.log('Connecting to BrightData Scraping Browser for reviews test...');
    browser = await chromium.connectOverCDP(wsEndpoint, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Playwright'
      }
    });
    
    const viewport = viewports[Math.floor(Math.random() * viewports.length)];
    const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    
    console.log('Creating new page for reviews test...');
    console.log(`Viewport: ${viewport.width}x${viewport.height}`);
    console.log(`User Agent: ${userAgent}`);
    
    const context = await browser.newContext({
      viewport,
      userAgent,
      locale: 'en-US',
      timezoneId: 'America/New_York',
      geolocation: { longitude: -73.935242, latitude: 40.730610 }, // New York
      permissions: ['geolocation'],
      bypassCSP: true,
      ignoreHTTPSErrors: true,
    });
    
    const page = await context.newPage();
    
    console.log('Navigating to Amazon reviews page...');
    await page.goto('https://www.amazon.com/product-reviews/B07HG5KSBS', {
      timeout: 60000,
      waitUntil: 'networkidle'
    });
    console.log('Navigation to reviews page completed successfully');
    
    const reviewsFileName = `reviews-page-${Date.now()}.png`;
    const reviewsFilePath = path.join(reviewsDir, reviewsFileName);
    console.log(`Taking reviews page screenshot and saving to: ${reviewsFilePath}`);
    await page.screenshot({ path: reviewsFilePath, fullPage: true });
    console.log(`Reviews page screenshot saved: ${reviewsFilePath}`);
    
    // Test 4: Screenshot of individual reviews
    console.log('\nTest 4: Capturing individual review screenshots');
    console.log('Searching for review card elements...');
    const reviewCards = await page.$$('[data-hook="review"]');
    console.log(`Found ${reviewCards.length} review cards`);
    
    for (let i = 0; i < Math.min(3, reviewCards.length); i++) {
      console.log(`Processing review ${i+1}...`);
      const reviewFileName = `review-${i+1}-${Date.now()}.png`;
      const reviewFilePath = path.join(reviewsDir, reviewFileName);
      console.log(`Taking screenshot of review ${i+1} and saving to: ${reviewFilePath}`);
      await reviewCards[i].screenshot({ path: reviewFilePath });
      console.log(`Review ${i+1} screenshot saved: ${reviewFilePath}`);
    }
    
    await browser.close();
  } catch (error) {
    console.log('❌ Test 3 failed with error:');
    console.log('Error name:', error instanceof Error ? error.name : 'Unknown');
    console.log('Error message:', error instanceof Error ? error.message : String(error));
    console.log('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
    if (browser) await browser.close();
  }
  
  // Test 5: Simulating an error condition
  console.log('\nTest 5: Simulating error condition screenshot');
  browser = null;
  try {
    console.log('Connecting to BrightData Scraping Browser for error test...');
    browser = await chromium.connectOverCDP(wsEndpoint, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Playwright'
      }
    });
    
    const viewport = viewports[Math.floor(Math.random() * viewports.length)];
    const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    
    console.log('Creating new page for error test...');
    const context = await browser.newContext({
      viewport,
      userAgent,
      locale: 'en-US',
      timezoneId: 'America/New_York',
      geolocation: { longitude: -73.935242, latitude: 40.730610 }, // New York
      permissions: ['geolocation'],
      bypassCSP: true,
      ignoreHTTPSErrors: true,
    });
    
    const page = await context.newPage();
    
    console.log('Navigating to invalid Amazon product page...');
    // Try to navigate to a product that probably doesn't exist
    await page.goto('https://www.amazon.com/dp/INVALID123456', {
      timeout: 30000,
      waitUntil: 'networkidle'
    }).catch(async (error) => {
      console.log('Encountered expected error (or redirection):', error.message);
      console.log('Capturing error page screenshot...');
      const errorFileName = `error-page-${Date.now()}.png`;
      const errorFilePath = path.join(errorsDir, errorFileName);
      await page.screenshot({ path: errorFilePath, fullPage: true });
      console.log(`Error screenshot saved: ${errorFilePath}`);
    });
    
    await browser.close();
  } catch (error) {
    console.log('❌ Test 5 failed with error:');
    console.log('Error name:', error instanceof Error ? error.name : 'Unknown');
    console.log('Error message:', error instanceof Error ? error.message : String(error));
    console.log('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
    if (browser) await browser.close();
  }
  
  console.log('\n✅ Advanced screenshot tests completed');
}

// Run the test
advancedScreenshotTest().catch(error => {
  console.error('Test failed with error:');
  console.error('Error name:', error instanceof Error ? error.name : 'Unknown');
  console.error('Error message:', error instanceof Error ? error.message : String(error));
  console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
  process.exit(1);
}); 