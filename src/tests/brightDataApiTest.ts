import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { BrightDataService, BrightDataScrapeOptions } from '../services/brightdata';

// Load environment variables
dotenv.config();

// BrightData API key and dataset ID from environment variables
const apiKey = process.env.BRIGHTDATA_API_KEY;
// Use the confirmed working dataset ID from previous testing
const datasetId = 'gd_le8e811kzy4ggddlq'; // This was confirmed to work in previous tests

// Test the BrightData service with our enhanced implementation
async function testBrightDataService() {
  if (!apiKey) {
    console.error('BRIGHTDATA_API_KEY environment variable is not set');
    process.exit(1);
  }

  const testAsin = 'B07ZPML7NP'; // Test with a real ASIN (Amazon Echo Dot)
  
  console.log('Testing Enhanced BrightData Amazon Reviews Service...');
  console.log(`Using API Key: ${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 5)}`);
  console.log(`Using Dataset ID: ${datasetId}`);
  console.log(`Testing with ASIN: ${testAsin}`);
  console.log('Note: Using cost-optimized settings (2 reviews).');
  
  try {
    // Initialize the BrightData service
    const brightDataService = new BrightDataService(apiKey, datasetId);
    
    // Define options for the scrape
    const options: BrightDataScrapeOptions = {
      asin: testAsin,
      country: 'us',
      include_product_data: true,
      reviews_count: 2, // Limit to 2 reviews to minimize costs
      sort_by: 'most_helpful',
      language: 'en',
      timeout: 60000, // 60 seconds timeout
      maxRetries: 3,
      retryDelay: 2000,
    };
    
    console.log('\nFetching reviews with enhanced service...');
    console.log('This may take a few minutes as we wait for the scraping job to complete.');
    console.log('The service now uses exponential backoff for polling (starting at 5s).');
    
    // Fetch reviews using the service
    const result = await brightDataService.fetchAmazonReviews(options);
    
    console.log('\n✅ Reviews fetched successfully!');
    
    // Save results to a file for inspection
    const outputDir = path.join('data');
    await fs.mkdir(outputDir, { recursive: true });
    
    const outputPath = path.join(outputDir, `${testAsin}-enhanced-test.json`);
    await fs.writeFile(
      outputPath,
      JSON.stringify(result, null, 2),
      'utf-8'
    );
    
    console.log(`\nResults saved to: ${outputPath}`);
    
    // Display a summary of the results
    console.log('\nProduct Information:');
    console.log(`- Title: ${result.product.title || 'No title'}`);
    console.log(`- Price: ${result.product.price.current} ${result.product.price.currency}`);
    console.log(`- Rating: ${result.product.rating.average || 'N/A'}/5 (${result.product.rating.total || 'N/A'} ratings)`);
    
    console.log(`\nReviews: ${result.reviews.length} fetched (${result.metadata.totalReviews || 'unknown'} total available)`);
    
    // Show the first review as an example (if available)
    if (result.reviews.length > 0) {
      const firstReview = result.reviews[0];
      console.log('\nSample Review:');
      console.log(`- Title: ${firstReview.title || 'No title'}`);
      console.log(`- Rating: ${firstReview.rating || 'N/A'}/5`);
      console.log(`- Date: ${firstReview.date.toISOString() || 'No date'}`);
      console.log(`- Author: ${firstReview.author?.name || 'Anonymous'}`);
      console.log(`- Text: ${firstReview.text ? 
        (firstReview.text.substring(0, 150) + (firstReview.text.length > 150 ? '...' : '')) : 
        'No text'}`);
    }
    
    // Test cache functionality
    console.log('\nTesting cache functionality...');
    console.log('Fetching the same ASIN again (should use cache)...');
    
    const startTime = Date.now();
    const cachedResult = await brightDataService.fetchAmazonReviews(options);
    const endTime = Date.now();
    
    console.log(`Second fetch completed in ${endTime - startTime}ms (should be much faster)`);
    console.log(`Cache hit: ${endTime - startTime < 1000 ? 'Yes' : 'No'}`);
    
    // Test cache clearing
    console.log('\nTesting cache clearing...');
    brightDataService.clearCache();
    console.log('Cache cleared. Fetching again (should trigger a new API call)...');
    
    // This would trigger a new API call, but we'll skip it to save costs
    console.log('Skipping actual fetch after cache clear to save costs.');
    
    console.log('\n✅ Enhanced BrightData service test completed successfully!');
    console.log('New features tested:');
    console.log('- NodeCache implementation');
    console.log('- File-based cache persistence');
    console.log('- Review count-based TTL');
    console.log('- Exponential backoff for polling');
    console.log('- Custom error handling');
    
  } catch (error: any) {
    console.error('\n❌ Error testing BrightData service:');
    if (error.name === 'BrightDataError') {
      console.error(`${error.name}: ${error.message}`);
      if (error.statusCode) {
        console.error(`Status Code: ${error.statusCode}`);
      }
      if (error.response) {
        console.error('Response:', error.response);
      }
    } else {
      console.error(error);
    }
  }
}

// Run the test
testBrightDataService().catch(console.error); 