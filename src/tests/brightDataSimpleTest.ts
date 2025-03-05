import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get API key and dataset ID from environment variables
const API_KEY = process.env.BRIGHTDATA_API_KEY;
const DATASET_ID = process.env.BRIGHTDATA_DATASET_ID;

if (!API_KEY || !DATASET_ID) {
  console.error('API key or dataset ID not found in environment variables.');
  process.exit(1);
}

console.log(`API Key: ${API_KEY.substring(0, 4)}...${API_KEY.substring(API_KEY.length - 4)}`);
console.log(`Dataset ID: ${DATASET_ID}`);

// ASIN of the product to test
const ASIN = 'B09G9FPHY6'; // Amazon Fire TV Stick

// Simple test for BrightData API for Amazon Product Scraper
async function testBrightDataAPI() {
  try {
    console.log('\nTesting BrightData Amazon Product Scraper API...');
    console.log(`Testing with ASIN: ${ASIN}`);
    
    // Step 1: Initiating a scraping job
    console.log('\nStep 1: Initiating scraping job...');
    
    // Use the exact format that was working before
    const response = await axios({
      method: 'post',
      url: 'https://api.brightdata.com/datasets/v3/trigger',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      params: {
        'dataset_id': DATASET_ID,
        'include_errors': 'true',
      },
      data: {
        deliver: {
          type: "api_pull"
        },
        input: [
          {
            url: `https://www.amazon.com/dp/${ASIN}`,
            country: 'us',
            reviews_count: 2,
            sort_by: 'recent',
          }
        ]
      },
      timeout: 60000,
    });
    
    if (!response.data || !response.data.snapshot_id) {
      console.error('Failed to get snapshot ID from the API');
      console.error('Response:', response.data);
      return;
    }
    
    const snapshotId = response.data.snapshot_id;
    console.log(`Successfully initiated scraping job with snapshot ID: ${snapshotId}`);
    
    // Step 2: Polling for results
    console.log('\nStep 2: Polling for results...');
    let isComplete = false;
    let attempts = 0;
    const maxAttempts = 20;
    const pollingInterval = 10000; // 10 seconds
    
    while (!isComplete && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, pollingInterval));
      attempts++;
      
      console.log(`Polling attempt ${attempts}/${maxAttempts}...`);
      
      const statusResponse = await axios({
        method: 'get',
        url: `https://api.brightdata.com/datasets/v3/progress/${snapshotId}`,
        headers: {
          'Authorization': `Bearer ${API_KEY}`
        }
      });
      
      console.log(`Status: ${statusResponse.data.status}`);
      
      if (statusResponse.data.status === 'ready') {
        isComplete = true;
        
        // Step 3: Getting the results
        console.log('\nStep 3: Getting results...');
        const resultsResponse = await axios({
          method: 'get',
          url: `https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}`,
          params: {
            'format': 'json',
            'compress': false
          },
          headers: {
            'Authorization': `Bearer ${API_KEY}`
          }
        });
        
        // Print a summary of the results
        const data = resultsResponse.data;
        
        console.log('\nResults Summary:');
        console.log('----------------');
        console.log(`Product: ${data.product?.title || 'N/A'}`);
        console.log(`Rating: ${data.product?.rating?.average || 'N/A'}/5 (${data.product?.rating?.count || 'N/A'} ratings)`);
        console.log(`Reviews fetched: ${data.reviews?.length || 0}`);
        
        // Print a sample review
        if (data.reviews && data.reviews.length > 0) {
          const review = data.reviews[0];
          console.log('\nSample Review:');
          console.log(`Title: ${review.title || 'N/A'}`);
          console.log(`Rating: ${review.rating || 'N/A'}`);
          console.log(`Date: ${review.date || 'N/A'}`);
          console.log(`Text: ${review.text ? review.text.substring(0, 150) + '...' : 'N/A'}`);
        }
        
        console.log('\nAPI Test completed successfully!');
      } else if (statusResponse.data.status === 'failed') {
        console.error(`Scraping job failed: ${statusResponse.data.reason || 'No reason provided'}`);
        break;
      }
      // If still running, continue polling
    }
    
    if (!isComplete) {
      console.error('Reached maximum polling attempts without completion');
    }
    
  } catch (error: any) {
    console.error('Error in BrightData API test:');
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error(`Status code: ${error.response.status}`);
      console.error('Response data:', error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from server');
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error(`Error message: ${error.message}`);
    }
  }
}

// Run the test
testBrightDataAPI(); 