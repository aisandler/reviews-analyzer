import { BrightDataService } from '../services/brightdata';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get API key and dataset ID from environment variables
const API_KEY = process.env.BRIGHTDATA_API_KEY;
const DATASET_ID = process.env.BRIGHTDATA_DATASET_ID;

// Print the API key and dataset ID for verification (partially masked for security)
if (API_KEY) {
  console.log(`API Key: ${API_KEY.substring(0, 4)}...${API_KEY.substring(API_KEY.length - 4)}`);
} else {
  console.error('BRIGHTDATA_API_KEY is not set in environment variables');
  process.exit(1);
}

if (DATASET_ID) {
  console.log(`Dataset ID: ${DATASET_ID}`);
} else {
  console.error('BRIGHTDATA_DATASET_ID is not set in environment variables');
  process.exit(1);
}

async function testBrightDataConnection() {
  try {
    // Create a BrightData service instance
    const brightData = new BrightDataService(API_KEY as string, DATASET_ID as string);
    
    // Test fetching reviews for a popular product
    const testAsin = 'B09G9FPHY6'; // Amazon Fire TV Stick
    console.log(`\nTesting fetch for ASIN: ${testAsin}`);
    
    const result = await brightData.fetchAmazonReviews({
      asin: testAsin,
      reviews_count: 2, // Fetch just 2 reviews to minimize cost
    });
    
    // Log results
    console.log('\nProduct Information:');
    console.log(`Title: ${result.product.title}`);
    console.log(`Rating: ${result.product.rating.average}/5 (${result.product.rating.total} ratings)`);
    console.log(`Price: ${result.product.price.currency} ${result.product.price.current}`);
    
    console.log('\nReviews:');
    result.reviews.forEach((review, index) => {
      console.log(`\nReview #${index + 1}:`);
      console.log(`Title: ${review.title}`);
      console.log(`Rating: ${review.rating}/5`);
      console.log(`Date: ${review.date}`);
      console.log(`Verified Purchase: ${review.verified ? 'Yes' : 'No'}`);
      console.log(`Helpful votes: ${review.helpful.votes}`);
      console.log(`Text: ${review.text.substring(0, 150)}...`);
    });
    
    console.log('\nMetadata:');
    console.log(`Total reviews: ${result.metadata.totalReviews}`);
    console.log(`Scraped reviews: ${result.metadata.scrapedReviews}`);
    console.log(`Time taken: ${result.metadata.duration}ms`);
  } catch (error) {
    console.error('Error testing BrightData connection:', error);
  }
}

// Run the test
testBrightDataConnection(); 