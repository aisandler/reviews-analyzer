import { BaseScraper } from './base';
import { ReviewScrapeResult } from '../types';
import { BrightDataService, BrightDataScrapeOptions } from '../services/brightdata';
import { ScraperConfig } from '../types';

/**
 * Amazon scraper using BrightData's specialized Amazon Scraper API
 * This implementation replaces the browser-based scraping with API calls
 */
export class BrightDataAmazonScraper extends BaseScraper {
  private brightDataService: BrightDataService;
  private options: Partial<BrightDataScrapeOptions>;
  private rateLimitMs: number;
  private lastRequestTime: number = 0;

  constructor(
    config: Partial<ScraperConfig> = {}, 
    options: Partial<BrightDataScrapeOptions> = {},
    rateLimitMs: number = 1000, // Default 1 second between requests
    cacheTTL?: number
  ) {
    super(config);
    
    // Validate that we have the required API key
    if (!process.env.BRIGHTDATA_API_KEY) {
      throw new Error('BRIGHTDATA_API_KEY environment variable is required');
    }
    
    // Validate that we have the required collector ID
    if (!process.env.BRIGHTDATA_COLLECTOR_ID) {
      throw new Error('BRIGHTDATA_COLLECTOR_ID environment variable is required');
    }
    
    // Initialize the BrightData service with optional cache TTL
    this.brightDataService = new BrightDataService(
      process.env.BRIGHTDATA_API_KEY,
      process.env.BRIGHTDATA_COLLECTOR_ID,
      cacheTTL
    );
    
    // Store options for the API
    this.options = options;
    
    // Set rate limit
    this.rateLimitMs = rateLimitMs;
  }

  /**
   * Scrape Amazon reviews for a product
   * @param asin Amazon Standard Identification Number
   * @returns Product and review data
   */
  public async scrape(asin: string): Promise<ReviewScrapeResult> {
    const startTime = Date.now();
    
    try {
      console.log(`Scraping Amazon reviews for product: ${asin} via BrightData API`);
      
      // Apply rate limiting if needed
      await this.applyRateLimit();
      
      // Use the BrightData service to fetch reviews
      const result = await this.brightDataService.fetchAmazonReviews({
        asin,
        ...this.options,
      });
      
      // Update last request time
      this.lastRequestTime = Date.now();
      
      // Take a screenshot if configured (just for compatibility)
      let screenshotPath: string | undefined;
      if (this.config.stealthMode?.simulateHumanBehavior) {
        console.log('Note: BrightData API doesn\'t need screenshots - this is just for compatibility');
        screenshotPath = await this.takeScreenshot(`amazon-${asin}`);
      }
      
      console.log(`Successfully scraped ${result.reviews.length} reviews for product: ${result.product.title}`);
      
      // Add any additional metadata
      return {
        product: result.product,
        reviews: result.reviews,
        metadata: {
          scrapedAt: result.metadata.scrapedAt,
          totalReviews: result.metadata.totalReviews,
          scrapedReviews: result.metadata.scrapedReviews,
          duration: Date.now() - startTime,
          // Add any additional metadata as a custom property in the metadata object
          additionalInfo: {
            screenshotPath,
            apiSource: 'BrightData Amazon Scraper API',
            apiOptions: {
              ...this.options,
              asin
            }
          }
        },
      };
    } catch (error) {
      console.error('Error scraping Amazon reviews:', error);
      
      // The error should already be in the correct format from the service
      throw error;
    }
  }

  /**
   * Clear the service cache
   */
  public clearCache(): void {
    this.brightDataService.clearCache();
  }

  /**
   * Apply rate limiting based on the last request time
   */
  private async applyRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitMs && this.lastRequestTime > 0) {
      const delayMs = this.rateLimitMs - timeSinceLastRequest;
      console.log(`Rate limiting: waiting ${delayMs}ms before next request`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  /**
   * Override the base class initialize method
   * This is a no-op as we don't need a browser for API calls
   */
  protected async initialize(): Promise<void> {
    // No browser initialization needed for API-based scraping
    console.log('Using BrightData API - no browser initialization needed');
    return;
  }

  /**
   * Override the base class close method
   * This is a no-op as we don't need a browser for API calls
   */
  protected async close(): Promise<void> {
    // No browser to close for API-based scraping
    console.log('Using BrightData API - no browser to close');
    return;
  }

  /**
   * Take a mock screenshot (for compatibility with the base scraper)
   * @param name Screenshot name
   * @returns Path to the screenshot
   */
  protected async takeScreenshot(name: string): Promise<string> {
    return `${this.config.screenshotDir}/${name}-api-based-no-screenshot.txt`;
  }
}

export default BrightDataAmazonScraper; 