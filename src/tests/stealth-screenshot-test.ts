import { chromium, Browser, Page, BrowserContext } from 'playwright';
import path from 'path';
import fs from 'fs/promises';
import dotenv from 'dotenv';

// Load environment variables from .env file
const rootDir = path.resolve(process.cwd(), '../..');
dotenv.config({ path: path.resolve(rootDir, '.env') });

// Random delay function
const randomDelay = async (min: number, max: number) => {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  console.log(`Waiting for ${delay}ms...`);
  await new Promise(resolve => setTimeout(resolve, delay));
};

// Random mouse movement simulation
const simulateHumanBehavior = async (page: Page) => {
  console.log('Simulating human behavior...');
  
  // Random scrolling
  const scrolls = Math.floor(Math.random() * 5) + 3; // 3-7 scrolls
  for (let i = 0; i < scrolls; i++) {
    const scrollY = Math.floor(Math.random() * 300) + 100;
    await page.evaluate((y) => { window.scrollBy(0, y); }, scrollY);
    await randomDelay(500, 1500);
  }
  
  // Random mouse movements
  for (let i = 0; i < 3; i++) {
    const x = Math.floor(Math.random() * 500) + 100;
    const y = Math.floor(Math.random() * 500) + 100;
    await page.mouse.move(x, y);
    await randomDelay(300, 800);
  }
};

async function stealthScreenshotTest() {
  console.log('Starting stealth screenshot test with BrightData...');
  
  const wsEndpoint = process.env.BRIGHTDATA_WS_ENDPOINT;
  if (!wsEndpoint) {
    throw new Error('BRIGHTDATA_WS_ENDPOINT environment variable is required');
  }
  console.log('Using WebSocket endpoint:', wsEndpoint);
  
  // Create screenshot directory and subdirectories
  const screenshotDir = path.join(process.cwd(), '../../screenshots');
  const productDir = path.join(screenshotDir, 'products');
  const reviewsDir = path.join(screenshotDir, 'reviews');
  
  console.log('Creating screenshot directories...');
  await fs.mkdir(screenshotDir, { recursive: true });
  await fs.mkdir(productDir, { recursive: true });
  await fs.mkdir(reviewsDir, { recursive: true });
  console.log('Screenshot directories created successfully');
  
  // Different product IDs to try
  const productIds = [
    'B09B9TB61Y', // Different product (iPhone charger)
    'B07ZPKN6YR', // Different product (Echo Dot)
    'B07PVCVBN7', // Different product (Fire TV Stick)
    'B08DFPV5HL', // Different product (Echo Show)
    'B07NQRP7CC'  // Different product (AirPods Pro)
  ];
  
  // Random product selection
  const productId = productIds[Math.floor(Math.random() * productIds.length)];
  console.log(`Selected product ID: ${productId}`);
  
  // Random viewport and user agent
  const viewports = [
    { width: 1920, height: 1080 },
    { width: 1440, height: 900 },
    { width: 1366, height: 768 },
    { width: 1536, height: 864 },
    { width: 1280, height: 720 }
  ];
  
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0'
  ];
  
  const viewport = viewports[Math.floor(Math.random() * viewports.length)];
  const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
  
  console.log(`Using viewport: ${viewport.width}x${viewport.height}`);
  console.log(`Using user agent: ${userAgent}`);
  
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  
  try {
    console.log('Connecting to BrightData Scraping Browser...');
    browser = await chromium.connectOverCDP(wsEndpoint, {
      timeout: 60000,
      headers: {
        'User-Agent': 'Playwright'
      }
    });
    
    // Create context with stealth settings
    console.log('Creating browser context with stealth settings...');
    context = await browser.newContext({
      viewport,
      userAgent,
      locale: 'en-US',
      timezoneId: 'America/New_York',
      geolocation: { longitude: -73.935242, latitude: 40.730610 }, // New York
      permissions: ['geolocation'],
      bypassCSP: true,
      ignoreHTTPSErrors: true,
      javaScriptEnabled: true,
      hasTouch: Math.random() > 0.5, // Randomly enable touch
      isMobile: Math.random() > 0.7, // 30% chance of mobile
      deviceScaleFactor: Math.random() > 0.5 ? 2 : 1, // Randomly use retina
      acceptDownloads: true,
    });
    
    // Create page
    console.log('Creating new page...');
    const page = await context.newPage();
    
    // Add additional stealth scripts
    await page.addInitScript(() => {
      // Overwrite the navigator properties
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
        configurable: true
      });
      
      // Hide automation
      Object.defineProperty(navigator, 'plugins', {
        get: () => {
          return [1, 2, 3, 4, 5];
        },
      });
      
      // Simple webdriver detection evasion
      if (navigator.hasOwnProperty('webdriver')) {
        // @ts-ignore
        delete Object.getPrototypeOf(navigator).webdriver;
      }
    });
    
    // First visit a neutral site
    console.log('Visiting neutral site first...');
    await page.goto('https://www.google.com', {
      timeout: 30000,
      waitUntil: 'networkidle'
    });
    
    await randomDelay(2000, 5000);
    
    // Now navigate to Amazon
    console.log(`Navigating to Amazon product page for ID: ${productId}...`);
    await page.goto(`https://www.amazon.com/dp/${productId}`, {
      timeout: 60000,
      waitUntil: 'networkidle'
    });
    
    console.log('Navigation completed');
    
    // Simulate human behavior
    await simulateHumanBehavior(page);
    
    // Take screenshot
    const productFileName = `product-${productId}-${Date.now()}.png`;
    const productFilePath = path.join(productDir, productFileName);
    console.log(`Taking screenshot and saving to: ${productFilePath}`);
    await page.screenshot({ path: productFilePath, fullPage: true });
    console.log(`Screenshot saved: ${productFilePath}`);
    
    // Check if we're on a product page or a captcha/error page
    const pageTitle = await page.title();
    console.log(`Page title: ${pageTitle}`);
    
    const isProductPage = await page.evaluate(() => {
      return !!document.querySelector('#productTitle') || 
             !!document.querySelector('.product-title') ||
             !!document.querySelector('.a-box-inner');
    });
    
    if (isProductPage) {
      console.log('Successfully loaded product page!');
      
      // Try to get product title
      const productTitle = await page.evaluate(() => {
        const titleElement = document.querySelector('#productTitle');
        return titleElement ? titleElement.textContent?.trim() : 'Title not found';
      });
      
      console.log(`Product title: ${productTitle}`);
      
      // Take screenshot of specific elements if they exist
      const titleElement = await page.$('#productTitle');
      if (titleElement) {
        const elementFileName = `product-title-${Date.now()}.png`;
        const elementFilePath = path.join(productDir, elementFileName);
        await titleElement.screenshot({ path: elementFilePath });
        console.log(`Title element screenshot saved: ${elementFilePath}`);
      }
      
      // Wait before navigating to reviews
      await randomDelay(3000, 7000);
      
      // Try to navigate to reviews page
      console.log('Navigating to reviews page...');
      await page.goto(`https://www.amazon.com/product-reviews/${productId}`, {
        timeout: 60000,
        waitUntil: 'networkidle'
      });
      
      // Simulate human behavior again
      await simulateHumanBehavior(page);
      
      // Take screenshot of reviews page
      const reviewsFileName = `reviews-${productId}-${Date.now()}.png`;
      const reviewsFilePath = path.join(reviewsDir, reviewsFileName);
      await page.screenshot({ path: reviewsFilePath, fullPage: true });
      console.log(`Reviews page screenshot saved: ${reviewsFilePath}`);
      
      // Check if we're on a reviews page
      const isReviewsPage = await page.evaluate(() => {
        return !!document.querySelector('[data-hook="review"]') || 
               !!document.querySelector('.review');
      });
      
      if (isReviewsPage) {
        console.log('Successfully loaded reviews page!');
        
        // Try to get individual reviews
        const reviewCards = await page.$$('[data-hook="review"]');
        console.log(`Found ${reviewCards.length} review cards`);
        
        for (let i = 0; i < Math.min(3, reviewCards.length); i++) {
          const reviewFileName = `review-${i+1}-${Date.now()}.png`;
          const reviewFilePath = path.join(reviewsDir, reviewFileName);
          await reviewCards[i].screenshot({ path: reviewFilePath });
          console.log(`Review ${i+1} screenshot saved: ${reviewFilePath}`);
          
          // Get review text
          const reviewText = await reviewCards[i].evaluate(el => {
            const reviewBody = el.querySelector('[data-hook="review-body"]');
            return reviewBody ? reviewBody.textContent?.trim() : 'Review text not found';
          });
          
          console.log(`Review ${i+1} text: ${reviewText?.substring(0, 100)}...`);
          
          await randomDelay(1000, 2000);
        }
      } else {
        console.log('Failed to load reviews page - likely detected as bot');
      }
    } else {
      console.log('Failed to load product page - likely detected as bot');
    }
    
    console.log('\n✅ Stealth screenshot test completed');
  } catch (error) {
    console.log('❌ Test failed with error:');
    console.log('Error name:', error instanceof Error ? error.name : 'Unknown');
    console.log('Error message:', error instanceof Error ? error.message : String(error));
    console.log('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
  } finally {
    if (context) await context.close();
    if (browser) await browser.close();
  }
}

// Run the test
stealthScreenshotTest().catch(error => {
  console.error('Test failed with error:');
  console.error('Error name:', error instanceof Error ? error.name : 'Unknown');
  console.error('Error message:', error instanceof Error ? error.message : String(error));
  console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
  process.exit(1);
}); 