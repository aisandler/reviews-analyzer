import axios, { AxiosError } from 'axios';
import { Product, Review, ReviewScrapeResult } from '../types';

/**
 * Interface for the BrightData Amazon Scraper API response
 */
interface BrightDataApiResponse {
  asin: string;
  url: string;
  product: {
    title: string;
    price: {
      value: number;
      currency: string;
      formatted: string;
    };
    rating: {
      average: number;
      count: number;
      distribution?: Record<string, number>;
    };
    [key: string]: any;
  };
  reviews: Array<{
    id: string;
    title: string;
    text: string;
    rating: number;
    date: string;
    verified_purchase: boolean;
    helpful_votes: number;
    total_votes?: number;
    author: {
      name: string;
      id?: string;
      profile_url?: string;
    };
    images?: Array<{
      url: string;
    }>;
    [key: string]: any;
  }>;
  total_reviews: number;
  metadata?: Record<string, any>;
}

/**
 * Options for the BrightData Amazon Scraper API
 */
export interface BrightDataScrapeOptions {
  asin: string;
  country?: string;
  include_product_data?: boolean;
  reviews_count?: number;
  sort_by?: 'most_helpful' | 'most_recent' | 'top_critical' | 'top_positive';
  language?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  collectorId?: string;
}

/**
 * Default options for the BrightData Amazon Scraper API
 */
const defaultOptions: Partial<BrightDataScrapeOptions> = {
  country: 'us',
  include_product_data: true,
  reviews_count: 2,
  sort_by: 'most_helpful',
  language: 'en',
  timeout: 60000,
  maxRetries: 3,
  retryDelay: 2000,
};

/**
 * Service for interacting with BrightData's Amazon Scraper API
 */
export class BrightDataService {
  private apiKey: string;
  private baseUrl: string = 'https://api.brightdata.com/datasets/v3/trigger';
  private datasetId: string;
  private cache: Map<string, {data: ReviewScrapeResult, timestamp: number}> = new Map();
  private cacheTTL: number = 60 * 60 * 1000; // Cache TTL: 1 hour in milliseconds

  constructor(apiKey: string, datasetId: string, cacheTTL?: number) {
    if (!apiKey) {
      throw new Error('BrightData API key is required');
    }
    if (!datasetId) {
      throw new Error('BrightData dataset ID is required');
    }
    this.apiKey = apiKey;
    this.datasetId = datasetId;
    
    // Set custom cache TTL if provided
    if (cacheTTL) {
      this.cacheTTL = cacheTTL;
    }
  }

  /**
   * Fetch Amazon reviews using BrightData's Scraper API with retry logic and caching
   * @param options Options for the API request
   * @returns Processed review data and product info
   */
  async fetchAmazonReviews(options: BrightDataScrapeOptions): Promise<ReviewScrapeResult> {
    const startTime = Date.now();
    const mergedOptions = { ...defaultOptions, ...options };
    
    // Generate a cache key based on the request parameters
    const cacheKey = this.generateCacheKey(mergedOptions);
    
    // Check if we have a valid cached response
    const cachedResult = this.getFromCache(cacheKey);
    if (cachedResult) {
      console.log(`Using cached result for ASIN: ${mergedOptions.asin}`);
      return cachedResult;
    }
    
    let retries = 0;
    const maxRetries = mergedOptions.maxRetries || 3;
    
    while (retries <= maxRetries) {
      try {
        console.log(`Fetching Amazon reviews for ASIN: ${mergedOptions.asin} via BrightData API (attempt ${retries + 1})`);
        
        // Step 1: Initiate the scraping process using the correct API structure
        const initiateResponse = await axios({
          method: 'post',
          url: this.baseUrl,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          params: {
            'dataset_id': this.datasetId,
            'include_errors': 'true',
          },
          data: {
            deliver: {
              type: "api_pull"
            },
            input: [
              {
                url: `https://www.amazon.com/dp/${mergedOptions.asin}`,
                country: mergedOptions.country,
                reviews_count: mergedOptions.reviews_count || 2,
                sort_by: mergedOptions.sort_by === 'most_recent' ? 'recent' : mergedOptions.sort_by,
              }
            ]
          },
          timeout: mergedOptions.timeout,
        });
        
        const snapshotId = initiateResponse.data.snapshot_id;
        if (!snapshotId) {
          throw new Error('Failed to get snapshot_id from BrightData API');
        }
        
        console.log(`Scraping job initiated with snapshot ID: ${snapshotId}`);
        
        // Step 2: Poll for results
        let scrapeComplete = false;
        let apiResponse: BrightDataApiResponse | null = null;
        let pollAttempts = 0;
        const maxPollAttempts = 20; // Increased number of polling attempts for 3-minute jobs
        const pollInterval = 15000; // 15-second intervals between polls
        
        while (!scrapeComplete && pollAttempts < maxPollAttempts) {
          // Wait between polls
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          pollAttempts++;
          
          console.log(`Polling for results (attempt ${pollAttempts}/${maxPollAttempts})...`);
          
          try {
            // Use the correct progress monitoring endpoint as shown in the documentation
            const statusResponse = await axios({
              method: 'get',
              url: `https://api.brightdata.com/datasets/v3/progress/${snapshotId}`,
              headers: {
                'Authorization': `Bearer ${this.apiKey}`
              },
              timeout: mergedOptions.timeout,
            });
            
            // Process the response
            if (statusResponse.data) {
              console.log(`Status: ${statusResponse.data.status}`);
              
              // According to docs, status can be "running", "ready", or "failed"
              if (statusResponse.data.status === 'ready') {
                scrapeComplete = true;
                
                // Get the actual results using the snapshot download endpoint
                const resultsResponse = await axios({
                  method: 'get',
                  url: `https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}`,
                  params: {
                    'format': 'json',
                    'compress': false,
                    'batch_size': mergedOptions.reviews_count ? Math.min(mergedOptions.reviews_count, 50) : 2 // Default to 2 records, or use reviews_count up to max 50
                  },
                  headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                  },
                  timeout: mergedOptions.timeout,
                });
                
                if (resultsResponse.data) {
                  // Assign the response directly
                  apiResponse = resultsResponse.data;
                } else {
                  throw new Error('No results found in the response');
                }
              } else if (statusResponse.data.status === 'failed') {
                throw new Error(`Scraping job failed: ${statusResponse.data.reason || 'No reason provided'}`);
              }
              // If status is "running", continue polling
            }
          } catch (pollError) {
            console.error(`Error polling for results (attempt ${pollAttempts}):`, pollError);
            // Continue polling despite errors
          }
        }
        
        if (!apiResponse) {
          throw new Error('Failed to get results after maximum polling attempts');
        }
        
        console.log(`Successfully fetched ${apiResponse.reviews.length} reviews for product: ${apiResponse.product.title}`);
        
        // Transform the API response to match our application's data model
        const result = this.transformResponse(apiResponse, startTime);
        
        // Cache the result
        this.saveToCache(cacheKey, result);
        
        return result;
      } catch (error) {
        const axiosError = error as AxiosError;
        
        // Check if the error is retryable
        const isRetryable = this.isRetryableError(axiosError);
        
        // If we have retries left and the error is retryable, try again
        if (retries < maxRetries && isRetryable) {
          retries++;
          console.warn(`Retryable error encountered, retrying (${retries}/${maxRetries})...`);
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, mergedOptions.retryDelay));
          continue;
        }
        
        console.error('Error fetching Amazon reviews via BrightData:', error);
        throw this.transformError(error);
      }
    }
    
    // Ensure we have a return statement at the end of the function
    throw new Error('Maximum retry attempts reached');
  }

  /**
   * Generate a cache key based on request parameters
   */
  private generateCacheKey(options: BrightDataScrapeOptions): string {
    return `${options.asin}-${options.country}-${options.language}-${options.sort_by}-${options.reviews_count}`;
  }

  /**
   * Save a result to the cache
   */
  private saveToCache(key: string, data: ReviewScrapeResult): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Get a result from the cache if it exists and is not expired
   */
  private getFromCache(key: string): ReviewScrapeResult | null {
    const cached = this.cache.get(key);
    
    // Return null if not in cache or TTL expired
    if (!cached || (Date.now() - cached.timestamp > this.cacheTTL)) {
      return null;
    }
    
    return cached.data;
  }

  /**
   * Clear the cache or a specific entry
   */
  public clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Determine if an error should be retried
   * @param error The axios error to check
   * @returns Whether the error is retryable
   */
  private isRetryableError(error: AxiosError): boolean {
    // Network errors are retryable
    if (!error.response) {
      return true;
    }
    
    // 429 (Too Many Requests) is retryable
    if (error.response.status === 429) {
      return true;
    }
    
    // 5xx errors are retryable
    if (error.response.status >= 500 && error.response.status < 600) {
      return true;
    }
    
    // Other errors (4xx except 429) are not retryable
    return false;
  }

  /**
   * Transform the BrightData API response to match our application's data model
   */
  private transformResponse(apiResponse: BrightDataApiResponse, startTime: number): ReviewScrapeResult {
    // Extract product information
    const product: Product = {
      id: apiResponse.asin,
      title: apiResponse.product.title,
      price: {
        current: apiResponse.product.price.value,
        currency: apiResponse.product.price.currency,
        discounted: false, // Default value, not provided by API
      },
      rating: {
        average: apiResponse.product.rating.average,
        total: apiResponse.product.rating.count,
        distribution: this.transformRatingDistribution(apiResponse.product.rating.distribution),
      },
      url: apiResponse.url,
      platform: 'amazon',
      metadata: apiResponse.product,
    };
    
    // Transform reviews
    const reviews: Review[] = apiResponse.reviews.map(apiReview => ({
      id: apiReview.id,
      title: apiReview.title,
      text: apiReview.text,
      rating: apiReview.rating,
      date: new Date(apiReview.date),
      verified: apiReview.verified_purchase,
      helpful: {
        votes: apiReview.helpful_votes,
        total: apiReview.total_votes,
      },
      author: {
        name: apiReview.author.name,
        id: apiReview.author.id,
      },
      images: apiReview.images?.map(image => image.url) || [],
      platform: 'amazon',
      productId: apiResponse.asin,
      metadata: apiReview,
    }));
    
    // Create and return the full result
    return {
      product,
      reviews,
      metadata: {
        scrapedAt: new Date(),
        totalReviews: apiResponse.total_reviews,
        scrapedReviews: reviews.length,
        duration: Date.now() - startTime,
        additionalInfo: {
          apiSource: 'brightdata',
          snapshotData: apiResponse.metadata,
        }
      }
    };
  }

  /**
   * Transform rating distribution
   */
  private transformRatingDistribution(distribution?: Record<string, number>): Record<number, number> | undefined {
    if (!distribution) {
      return undefined;
    }
    
    const result: Record<number, number> = {};
    
    // Convert string keys to numbers
    Object.entries(distribution).forEach(([key, value]) => {
      result[parseInt(key, 10)] = value;
    });
    
    return result;
  }

  /**
   * Transform errors from the API to match our application's error format
   */
  private transformError(error: any): Error {
    let message = 'Unknown error occurred while fetching Amazon reviews';
    let type = 'UNKNOWN';
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      message = `API Error (${error.response.status}): ${error.response.data?.message || error.message}`;
      
      switch (error.response.status) {
        case 401:
        case 403:
          type = 'BLOCKED';
          break;
        case 404:
          type = 'NOT_FOUND';
          break;
        case 429:
          type = 'NETWORK';
          break;
        default:
          type = 'UNKNOWN';
      }
    } else if (error.request) {
      // The request was made but no response was received
      message = 'Network error: No response received from API';
      type = 'NETWORK';
    } else {
      // Something happened in setting up the request that triggered an Error
      message = error.message || message;
      type = 'UNKNOWN';
    }
    
    return {
      name: 'BrightDataError',
      message,
      type,
      retryable: ['NETWORK', 'TIMEOUT'].includes(type),
      metadata: {
        originalError: error.message,
        stack: error.stack,
      },
    } as any;
  }
} 