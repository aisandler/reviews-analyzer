import path from 'path';
import { ScraperConfig } from '../types';

// Validate required environment variables
const requiredEnvVars = [
  'USER_AGENT',
  'SCRAPE_DELAY',
  'MAX_RETRIES',
  'BRIGHTDATA_WS_ENDPOINT',  // Required for Scraping Browser
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Default configuration values
const defaultConfig: Partial<ScraperConfig> = {
  delay: 2000,
  maxRetries: 3,
  timeout: 30000,
  screenshotDir: path.join(process.cwd(), 'screenshots'),
  logLevel: 'info',
  cookiesDir: path.join(process.cwd(), 'cookies'),
  sessionRotationInterval: 1800000, // 30 minutes
  maxRequestsPerSession: 25,
  rateLimitDelay: {
    min: 300000,  // 5 minutes
    max: 900000   // 15 minutes
  },
  stealthMode: {
    rotateUserAgent: true,
    useFingerprinting: true,
    simulateHumanBehavior: true,
    randomizeViewport: true,
  },
  scrapingBrowser: {
    wsEndpoint: process.env.BRIGHTDATA_WS_ENDPOINT || '',
    seleniumEndpoint: process.env.BRIGHTDATA_SELENIUM_ENDPOINT || ''
  }
};

// Create scraper configuration
export const scraperConfig: ScraperConfig = {
  ...defaultConfig,
  userAgent: process.env.USER_AGENT!,
  delay: parseInt(process.env.SCRAPE_DELAY || String(defaultConfig.delay), 10),
  maxRetries: parseInt(process.env.MAX_RETRIES || String(defaultConfig.maxRetries), 10),
  timeout: parseInt(process.env.TIMEOUT || String(defaultConfig.timeout), 10),
  screenshotDir: process.env.SCREENSHOT_DIR || defaultConfig.screenshotDir!,
  logLevel: (process.env.LOG_LEVEL || defaultConfig.logLevel!) as ScraperConfig['logLevel'],
  cookiesDir: process.env.COOKIES_DIR || defaultConfig.cookiesDir!,
  sessionRotationInterval: parseInt(process.env.SESSION_ROTATION_INTERVAL || String(defaultConfig.sessionRotationInterval), 10),
  maxRequestsPerSession: parseInt(process.env.MAX_REQUESTS_PER_SESSION || String(defaultConfig.maxRequestsPerSession), 10),
  rateLimitDelay: {
    min: parseInt(process.env.RATE_LIMIT_MIN || String(defaultConfig.rateLimitDelay!.min), 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || String(defaultConfig.rateLimitDelay!.max), 10),
  },
  stealthMode: {
    rotateUserAgent: process.env.ROTATE_USER_AGENT !== 'false',
    useFingerprinting: process.env.USE_FINGERPRINTING !== 'false',
    simulateHumanBehavior: process.env.SIMULATE_HUMAN_BEHAVIOR !== 'false',
    randomizeViewport: process.env.RANDOMIZE_VIEWPORT !== 'false',
  },
  scrapingBrowser: {
    wsEndpoint: process.env.BRIGHTDATA_WS_ENDPOINT!,
    seleniumEndpoint: process.env.BRIGHTDATA_SELENIUM_ENDPOINT || defaultConfig.scrapingBrowser!.seleniumEndpoint
  }
};

// Amazon-specific configuration
export const amazonConfig = {
  baseUrl: 'https://www.amazon.com',
  reviewsPath: '/product-reviews',
  selectors: {
    productTitle: '#productTitle',
    price: '#priceblock_ourprice, .a-price .a-offscreen',
    rating: '#acrPopover .a-icon-alt',
    totalReviews: '#acrCustomerReviewText',
    reviewCards: '[data-hook="review"]',
    reviewTitle: '[data-hook="review-title"]',
    reviewText: '[data-hook="review-body"]',
    reviewRating: 'i.review-rating',
    reviewDate: '[data-hook="review-date"]',
    reviewAuthor: '.a-profile-name',
    reviewImages: '[data-hook="review-image-tile"]',
    helpfulVotes: '[data-hook="helpful-vote-statement"]',
    verifiedPurchase: '[data-hook="avp-badge"]',
  },
  maxReviewsPerPage: 10,
  userAgents: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPad; CPU OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
  ],
  viewportSizes: [
    { width: 1920, height: 1080 },
    { width: 1440, height: 900 },
    { width: 1366, height: 768 },
    { width: 1280, height: 800 },
    { width: 375, height: 812 },  // iPhone X
    { width: 414, height: 896 },  // iPhone XR
  ],
};

// Export configuration
export default {
  scraper: scraperConfig,
  amazon: amazonConfig,
}; 