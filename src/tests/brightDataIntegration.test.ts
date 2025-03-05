import { BrightDataService } from '../services/brightdata';
import axios, { AxiosResponse } from 'axios';
import { ReviewScrapeResult } from '../types';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.MockedFunction<typeof axios>;

describe('BrightData Amazon Scraper API Integration', () => {
  // Sample mock response data
  const mockApiResponse = {
    asin: 'B00TEST123',
    url: 'https://www.amazon.com/dp/B00TEST123',
    product: {
      title: 'Test Product',
      price: {
        value: 29.99,
        currency: 'USD',
        formatted: '$29.99'
      },
      rating: {
        average: 4.5,
        count: 1000,
        distribution: {
          '1': 50,
          '2': 50,
          '3': 100,
          '4': 300,
          '5': 500
        }
      }
    },
    reviews: [
      {
        id: 'R123TEST456',
        title: 'Great product',
        text: 'This is a fantastic product, highly recommend it.',
        rating: 5,
        date: '2023-01-15',
        verified_purchase: true,
        helpful_votes: 25,
        total_votes: 30,
        author: {
          name: 'John Doe',
          id: 'JDOE123',
          profile_url: 'https://www.amazon.com/profile/JDOE123'
        }
      },
      {
        id: 'R456TEST789',
        title: 'Decent but could be better',
        text: 'The product works well enough, but I expected more for the price.',
        rating: 3,
        date: '2023-02-20',
        verified_purchase: true,
        helpful_votes: 10,
        total_votes: 15,
        author: {
          name: 'Jane Smith',
          id: 'JSMITH456',
          profile_url: 'https://www.amazon.com/profile/JSMITH456'
        },
        images: [
          { url: 'https://example.com/image1.jpg' },
          { url: 'https://example.com/image2.jpg' }
        ]
      }
    ],
    total_reviews: 1000,
    metadata: {
      timestamp: new Date().toISOString()
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should successfully fetch and transform Amazon reviews', async () => {
    // Setup mock response
    const mockResponse = { data: mockApiResponse } as AxiosResponse;
    mockedAxios.mockResolvedValue(mockResponse);

    // Create instance with a fake API key
    const service = new BrightDataService('test-api-key', 'test-collector-id');
    
    // Call the service
    const result = await service.fetchAmazonReviews({ asin: 'B00TEST123' });
    
    // Verify API was called with correct parameters
    expect(mockedAxios).toHaveBeenCalledTimes(1);
    expect(mockedAxios).toHaveBeenCalledWith(expect.objectContaining({
      method: 'post',
      url: 'https://api.brightdata.com/amazon/reviews',
      headers: expect.objectContaining({
        'Authorization': 'Bearer test-api-key'
      }),
      data: expect.objectContaining({
        asin: 'B00TEST123'
      })
    }));
    
    // Verify result structure
    expect(result).toHaveProperty('product');
    expect(result).toHaveProperty('reviews');
    expect(result).toHaveProperty('metadata');
    
    // Verify product data transformation
    expect(result.product.id).toBe(mockApiResponse.asin);
    expect(result.product.title).toBe(mockApiResponse.product.title);
    expect(result.product.rating.average).toBe(mockApiResponse.product.rating.average);
    
    // Verify reviews data transformation
    expect(result.reviews).toHaveLength(mockApiResponse.reviews.length);
    expect(result.reviews[0].id).toBe(mockApiResponse.reviews[0].id);
    expect(result.reviews[0].title).toBe(mockApiResponse.reviews[0].title);
    expect(result.reviews[0].rating).toBe(mockApiResponse.reviews[0].rating);
    
    // Verify metadata
    expect(result.metadata.totalReviews).toBe(mockApiResponse.total_reviews);
    expect(result.metadata.scrapedReviews).toBe(mockApiResponse.reviews.length);
  });
  
  test('should handle API errors correctly', async () => {
    // Setup mock error response
    const apiError = new Error('API Error');
    Object.assign(apiError, {
      response: {
        status: 401,
        data: {
          message: 'Invalid API key'
        }
      }
    });
    mockedAxios.mockRejectedValue(apiError);
    
    // Create instance with an invalid API key to trigger error
    const service = new BrightDataService('invalid-api-key', 'test-collector-id');
    
    // Call the service and expect it to throw
    await expect(service.fetchAmazonReviews({ asin: 'B00TEST123' }))
      .rejects
      .toMatchObject({
        name: 'ScrapingError',
        type: 'BLOCKED'
      });
  });
  
  test('should implement caching correctly', async () => {
    // For this test, we need to mock axios for different calls
    // First call - successful response
    const mockResponse1 = { data: mockApiResponse } as AxiosResponse;
    
    // Used for different country parameter
    const mockResponse2 = { 
      data: {
        ...mockApiResponse,
        url: 'https://www.amazon.co.uk/dp/B00TEST123'
      } 
    } as AxiosResponse;
    
    // After cache clear
    const mockResponse3 = { data: mockApiResponse } as AxiosResponse;
    
    // Setup the mock implementation to return different responses
    mockedAxios
      .mockResolvedValueOnce(mockResponse1)
      .mockResolvedValueOnce(mockResponse2)
      .mockResolvedValueOnce(mockResponse3);
    
    // Create service with mock
    const service = new BrightDataService('test-api-key', 'test-collector-id');
    
    // First call should hit the API
    await service.fetchAmazonReviews({ 
      asin: 'B00TEST123',
      country: 'us',
      language: 'en'
    });
    
    // Second call with same parameters should use the cache
    await service.fetchAmazonReviews({ 
      asin: 'B00TEST123',
      country: 'us',
      language: 'en'
    });
    
    // Third call with different parameters should hit the API again
    await service.fetchAmazonReviews({ 
      asin: 'B00TEST123',
      country: 'uk',
      language: 'en'
    });
    
    // Verify API was called exactly twice
    expect(mockedAxios).toHaveBeenCalledTimes(2);
    
    // Clear cache and call again - should hit API
    service.clearCache();
    await service.fetchAmazonReviews({ 
      asin: 'B00TEST123',
      country: 'us',
      language: 'en'
    });
    
    // Verify API was called exactly 3 times in total
    expect(mockedAxios).toHaveBeenCalledTimes(3);
  });
  
  test('should retry transient errors', async () => {
    // Setup mock responses - first call fails with 429, second succeeds
    const rateLimitError = new Error('Rate limit exceeded');
    Object.assign(rateLimitError, {
      response: {
        status: 429,
        data: {
          message: 'Too many requests'
        }
      }
    });
    
    const successResponse = { data: mockApiResponse } as AxiosResponse;
    
    // Setup mock to fail first then succeed
    mockedAxios
      .mockRejectedValueOnce(rateLimitError)
      .mockResolvedValueOnce(successResponse);
    
    // Create instance with fake API key
    const service = new BrightDataService('test-api-key', 'test-collector-id');
    
    // Call with short retry delay for faster testing
    const result = await service.fetchAmazonReviews({ 
      asin: 'B00TEST123',
      maxRetries: 3,
      retryDelay: 100
    });
    
    // Verify API was called twice (1 failure + 1 success)
    expect(mockedAxios).toHaveBeenCalledTimes(2);
    
    // Verify we got a successful result after retry
    expect(result).toHaveProperty('product');
    expect(result).toHaveProperty('reviews');
  });
}); 