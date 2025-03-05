import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs/promises';

async function testScreenshot() {
  console.log('Starting screenshot test...');
  
  const wsEndpoint = process.env.BRIGHTDATA_WS_ENDPOINT;
  if (!wsEndpoint) {
    throw new Error('BRIGHTDATA_WS_ENDPOINT environment variable is required');
  }
  
  console.log('Using WebSocket endpoint:', wsEndpoint);
  
  // Create screenshot directory if it doesn't exist
  const screenshotDir = path.join(process.cwd(), 'screenshots');
  await fs.mkdir(screenshotDir, { recursive: true });
  
  let browser = null;
  
  try {
    console.log('Connecting to BrightData Scraping Browser...');
    browser = await chromium.connectOverCDP(wsEndpoint, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Playwright'
      }
    });
    
    console.log('Connected successfully! Creating new page...');
    const page = await browser.newPage();
    
    console.log('Testing navigation to Amazon...');
    await page.goto('https://www.amazon.com/dp/B07HG5KSBS', {
      timeout: 60000,
      waitUntil: 'networkidle'
    });
    
    console.log('Taking screenshot...');
    const fileName = `amazon-product-${Date.now()}.png`;
    const filePath = path.join(screenshotDir, fileName);
    await page.screenshot({ path: filePath, fullPage: true });
    console.log(`Screenshot saved: ${filePath}`);
    
    console.log('✅ Screenshot test passed');
  } catch (error) {
    console.log('❌ Screenshot test failed with error:');
    console.log('Error name:', error instanceof Error ? error.name : 'Unknown');
    console.log('Error message:', error instanceof Error ? error.message : String(error));
    console.log('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
testScreenshot().catch(error => {
  console.error('Test failed');
  process.exit(1);
}); 