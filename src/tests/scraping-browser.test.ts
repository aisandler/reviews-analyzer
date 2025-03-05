import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function testScrapingBrowserConnection() {
  console.log('Starting test...');
  console.log('Node version:', process.version);
  
  // Get Playwright version
  const playwrightPackagePath = path.join(process.cwd(), 'node_modules', 'playwright', 'package.json');
  const playwrightPackage = JSON.parse(fs.readFileSync(playwrightPackagePath, 'utf8'));
  console.log('Playwright version:', playwrightPackage.version);
  
  console.log('Testing connection to BrightData Scraping Browser...');
  
  const wsEndpoint = 'wss://brd-customer-hl_31b58fb8-zone-scraping_browser1:98wwnm9s5ti0@brd.superproxy.io:9222';
  console.log('Using WebSocket endpoint:', wsEndpoint);

  try {
    // Validate WebSocket URL format
    new URL(wsEndpoint);
    console.log('✅ WebSocket URL is valid');

    console.log('Attempting to connect to browser...');
    const browser = await chromium.connectOverCDP(wsEndpoint, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Playwright'
      }
    });

    try {
      console.log('Connected successfully! Creating new page...');
      const page = await browser.newPage();
      
      console.log('Testing navigation...');
      await page.goto('http://lumtest.com/myip.json', {
        timeout: 30000,
        waitUntil: 'networkidle'
      });

      const content = await page.content();
      console.log('Page content:', content);
      
      console.log('✅ Connection test passed');
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.log('❌ Connection test failed with error:');
    console.log('Error name:', error instanceof Error ? error.name : 'Unknown');
    console.log('Error message:', error instanceof Error ? error.message : String(error));
    console.log('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
    throw error;
  }
}

// Run the test
testScrapingBrowserConnection().catch(error => {
  console.error('Test failed');
  process.exit(1);
}); 