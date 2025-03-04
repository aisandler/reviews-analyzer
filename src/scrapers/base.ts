import { Browser, BrowserContext, Page, chromium } from 'playwright';
import path from 'path';
import fs from 'fs/promises';
import { ScraperConfig, ScrapingError } from '../types';
import { scraperConfig } from '../config';

export abstract class BaseScraper {
  protected browser: Browser | null = null;
  protected context: BrowserContext | null = null;
  protected page: Page | null = null;
  protected config: ScraperConfig;

  constructor(config: Partial<ScraperConfig> = {}) {
    this.config = { ...scraperConfig, ...config };
  }

  protected async initialize(): Promise<void> {
    try {
      // Launch browser
      this.browser = await chromium.launch({
        headless: true,
      });

      // Create context with proxy if configured
      this.context = await this.browser.newContext({
        userAgent: this.config.userAgent,
        proxy: this.config.proxyServer ? {
          server: this.config.proxyServer,
        } : undefined,
      });

      // Create new page
      this.page = await this.context.newPage();

      // Set default timeout
      this.page.setDefaultTimeout(this.config.timeout);

      // Ensure screenshot directory exists
      await fs.mkdir(this.config.screenshotDir, { recursive: true });
    } catch (error) {
      throw this.createError('Failed to initialize browser', 'UNKNOWN', error as Error);
    }
  }

  protected async close(): Promise<void> {
    await this.page?.close();
    await this.context?.close();
    await this.browser?.close();
    this.page = null;
    this.context = null;
    this.browser = null;
  }

  protected async takeScreenshot(name: string): Promise<string> {
    if (!this.page) {
      throw this.createError('Browser not initialized', 'UNKNOWN');
    }

    const fileName = `${name}-${Date.now()}.png`;
    const filePath = path.join(this.config.screenshotDir, fileName);
    await this.page.screenshot({ path: filePath, fullPage: true });
    return filePath;
  }

  protected async retry<T>(
    operation: () => Promise<T>,
    retries = this.config.maxRetries
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        if (attempt < retries) {
          // Wait before retrying with exponential backoff
          await this.delay(this.config.delay * Math.pow(2, attempt - 1));
          continue;
        }
      }
    }

    throw this.createError(
      `Operation failed after ${retries} attempts`,
      'UNKNOWN',
      lastError as Error
    );
  }

  protected createError(
    message: string,
    type: ScrapingError['type'],
    originalError?: Error
  ): ScrapingError {
    const error = new Error(message) as ScrapingError;
    error.type = type;
    error.retryable = ['NETWORK', 'TIMEOUT', 'BLOCKED'].includes(type);
    error.stack = originalError?.stack;
    error.metadata = {
      originalError: originalError?.message,
      timestamp: new Date().toISOString(),
    };
    return error;
  }

  protected async delay(ms: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  protected abstract scrape(...args: any[]): Promise<any>;
} 