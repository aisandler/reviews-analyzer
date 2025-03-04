import dotenv from 'dotenv';
import path from 'path';
import { ScraperConfig } from '../types';

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  'USER_AGENT',
  'SCRAPE_DELAY',
  'MAX_RETRIES',
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
};

// Create scraper configuration
export const scraperConfig: ScraperConfig = {
  ...defaultConfig,
  userAgent: process.env.USER_AGENT!,
  proxyServer: process.env.PROXY_SERVER,
  delay: parseInt(process.env.SCRAPE_DELAY || String(defaultConfig.delay), 10),
  maxRetries: parseInt(process.env.MAX_RETRIES || String(defaultConfig.maxRetries), 10),
  timeout: parseInt(process.env.TIMEOUT || String(defaultConfig.timeout), 10),
  screenshotDir: process.env.SCREENSHOT_DIR || defaultConfig.screenshotDir!,
  logLevel: (process.env.LOG_LEVEL || defaultConfig.logLevel!) as ScraperConfig['logLevel'],
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
};

// Export configuration
export default {
  scraper: scraperConfig,
  amazon: amazonConfig,
}; 