#!/usr/bin/env node
import { BrightDataService } from '../services/brightdata';
import 'dotenv/config';

/**
 * A simple script to test if your BrightData API key is working correctly
 * This makes a small test request to validate connectivity without doing a full scrape
 */
async function testApi() {
  console.log('Testing BrightData Amazon Scraper API connectivity...');
  
  // 1. Check if API key is set
  const apiKey = process.env.BRIGHTDATA_API_KEY;
  if (!apiKey) {
    console.error('❌ Error: BRIGHTDATA_API_KEY environment variable is not set');
    console.log('Please set your BrightData API key in the .env file:');
    console.log('BRIGHTDATA_API_KEY=your_api_key_here');
    process.exit(1);
  }
  
  console.log('✅ Found BrightData API key in environment variables');
  
  // Check for collector ID
  const collectorId = process.env.BRIGHTDATA_COLLECTOR_ID;
  if (!collectorId) {
    console.error('❌ BRIGHTDATA_COLLECTOR_ID not found in environment variables');
    console.error('Please add BRIGHTDATA_COLLECTOR_ID to your .env file');
    process.exit(1);
  }
  
  console.log('✅ Found BrightData collector ID in environment variables');
  
  // 2. Create a service instance
  const service = new BrightDataService(apiKey, collectorId);
  console.log('✅ Created BrightDataService instance');
  
  // 3. Make a minimal test request (just 1 review from a popular product)
  // We use the Amazon Kindle Paperwhite, which is a popular product with many reviews
  const testAsin = 'B08KTZ8249'; // Amazon Kindle Paperwhite
  
  try {
    console.log(`🔍 Making test request for product ASIN: ${testAsin} (Amazon Kindle Paperwhite)`);
    console.log('   This will retrieve just 1 review to validate connectivity...');
    
    const startTime = Date.now();
    const result = await service.fetchAmazonReviews({
      asin: testAsin,
      reviews_count: 1, // Just get 1 review to minimize API usage
      include_product_data: true,
    });
    
    const duration = (Date.now() - startTime) / 1000;
    
    console.log('\n✅ API test completed successfully!');
    console.log('---------------------------------------');
    console.log(`Product: ${result.product.title}`);
    console.log(`Total available reviews: ${result.metadata.totalReviews}`);
    console.log(`Retrieved: ${result.reviews.length} review(s)`);
    console.log(`Request duration: ${duration.toFixed(2)} seconds`);
    
    if (result.reviews.length > 0) {
      const review = result.reviews[0];
      console.log('\nSample review:');
      console.log(`- Title: ${review.title}`);
      console.log(`- Rating: ${review.rating}/5`);
      console.log(`- Date: ${review.date}`);
      console.log(`- Verified: ${review.verified}`);
      console.log(`- By: ${review.author.name}`);
      console.log(`- Text: ${review.text.substring(0, 150)}${review.text.length > 150 ? '...' : ''}`);
    }
    
    console.log('\n✨ Your BrightData API key is working correctly! ✨');
    console.log('You can now use the BrightData Amazon Scraper API for full scraping.');
    
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ API test failed:');
    
    if (error.message && error.message.includes('API key')) {
      console.error('Your BrightData API key appears to be invalid.');
      console.error('Please double-check your API key in the .env file.');
    } else {
      console.error('Error details:', error);
    }
    
    console.log('\nTroubleshooting steps:');
    console.log('1. Verify your API key is correct in the .env file');
    console.log('2. Check your network connection');
    console.log('3. Ensure you have access to the BrightData Amazon Scraper API in your subscription');
    console.log('4. Contact BrightData support if the problem persists');
    
    process.exit(1);
  }
}

// Run the test
testApi(); 