export interface Review {
  id: string;
  title: string;
  text: string;
  rating: number;
  date: Date;
  verified: boolean;
  helpful: {
    votes: number;
    total?: number;
  };
  author: {
    name: string;
    id?: string;
  };
  images?: string[];
  platform: 'amazon' | 'walmart';
  productId: string;
  metadata?: Record<string, unknown>;
}

export interface Product {
  id: string;
  title: string;
  price: {
    current: number;
    currency: string;
    discounted?: boolean;
    original?: number;
  };
  rating: {
    average: number;
    total: number;
    distribution?: Record<number, number>;
  };
  url: string;
  platform: 'amazon' | 'walmart';
  metadata?: Record<string, unknown>;
}

export interface ScraperConfig {
  userAgent: string;
  proxyServer?: string;
  delay: number;
  maxRetries: number;
  timeout: number;
  screenshotDir: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface ScrapingError extends Error {
  type: 'NETWORK' | 'TIMEOUT' | 'BLOCKED' | 'NOT_FOUND' | 'PARSING' | 'UNKNOWN';
  retryable: boolean;
  metadata?: Record<string, unknown>;
}

export interface ReviewScrapeResult {
  product: Product;
  reviews: Review[];
  error?: ScrapingError;
  metadata: {
    scrapedAt: Date;
    totalReviews: number;
    scrapedReviews: number;
    duration: number;
  };
} 