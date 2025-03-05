import { chromium, Browser } from 'playwright';
import path from 'path';
import fs from 'fs/promises';
import dotenv from 'dotenv';

// Load environment variables from .env file
const rootDir = path.resolve(process.cwd(), '../..');
dotenv.config({ path: path.resolve(rootDir, '.env') });

async function proxyTest() {
  console.log('Starting BrightData proxy connection test...');
  
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
    
    // Test with a simple website first
    console.log('Navigating to a test website...');
    await page.goto('http://lumtest.com/myip.json', {
      timeout: 30000,
      waitUntil: 'networkidle'
    });
    
    console.log('Navigation completed');
    
    // Get page content
    const content = await page.content();
    console.log('Page content:', content);
    
    // Take screenshot
    const fileName = `proxy-test-${Date.now()}.png`;
    const filePath = path.join(screenshotDir, fileName);
    console.log(`Taking screenshot and saving to: ${filePath}`);
    await page.screenshot({ path: filePath, fullPage: true });
    console.log(`Screenshot saved: ${filePath}`);
    
    console.log('\n✅ Proxy test completed successfully');
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
proxyTest().catch(error => {
  console.error('Test failed with error:');
  console.error('Error name:', error instanceof Error ? error.name : 'Unknown');
  console.error('Error message:', error instanceof Error ? error.message : String(error));
  console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
  process.exit(1);
}); 