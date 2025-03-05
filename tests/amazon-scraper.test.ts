import { AmazonScraper } from '../src/scrapers/amazon';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config();

describe('AmazonScraper', () => {
  let scraper: AmazonScraper;
  
  beforeEach(() => {
    // Create a new scraper instance before each test
    scraper = new AmazonScraper({
      // Override default config for testing
      delay: 5000, // Increase delay between retries
      maxRetries: 3,
      timeout: 60000, // Increase page timeout
    });
  });

  it('should scrape product reviews successfully', async () => {
    // Use a real ASIN for testing - this is for the Amazon Basics USB keyboard
    const asin = 'B07HG5KSBS';
    
    try {
      const result = await scraper.scrape(asin);
      
      // Basic validation
      expect(result).toBeDefined();
      expect(result.product).toBeDefined();
      expect(result.product.id).toBe(asin);
      expect(result.product.title).toBeTruthy();
      expect(result.product.rating).toBeDefined();
      expect(result.reviews).toBeDefined();
      expect(Array.isArray(result.reviews)).toBe(true);
      
      // Log the results
      console.log('Test Results:', {
        productTitle: result.product.title,
        price: result.product.price,
        rating: result.product.rating,
        reviewsScraped: result.reviews.length,
        scrapeDuration: result.metadata.duration
      });

      // Save results to a file for inspection
      const testResultsDir = path.join(__dirname, '..', 'test-results');
      if (!fs.existsSync(testResultsDir)) {
        fs.mkdirSync(testResultsDir);
      }
      
      fs.writeFileSync(
        path.join(testResultsDir, `amazon-test-${Date.now()}.json`),
        JSON.stringify(result, null, 2)
      );
    } catch (error: any) {
      // Enhanced error logging
      console.error('Test failed with error:', {
        message: error.message,
        type: error.type,
        retryable: error.retryable,
        metadata: error.metadata,
        stack: error.stack
      });
      throw error;
    }
  }, 120000); // Increase timeout to 2 minutes for this test
}); 