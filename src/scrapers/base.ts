import { Browser, BrowserContext, Page, chromium } from 'playwright';
import path from 'path';
import fs from 'fs/promises';
import { ScraperConfig, ScrapingError } from '../types';
import { scraperConfig, amazonConfig } from '../config';

export abstract class BaseScraper {
  protected browser: Browser | null = null;
  protected context: BrowserContext | null = null;
  protected page: Page | null = null;
  protected config: ScraperConfig;
  private cookiesPath: string;
  private requestCount: number = 0;
  private sessionStartTime: number = Date.now();

  constructor(config: Partial<ScraperConfig> = {}) {
    this.config = { ...scraperConfig, ...config };
    this.cookiesPath = path.join(this.config.cookiesDir, 'amazon_cookies.json');
  }

  protected async initialize(): Promise<void> {
    try {
      console.log('Connecting to BrightData Scraping Browser...');
      
      // Connect to BrightData's Scraping Browser
      this.browser = await chromium.connect({
        wsEndpoint: this.config.scrapingBrowser.wsEndpoint,
      });
      console.log('Connected to Scraping Browser successfully');

      // Select random viewport size if enabled
      const viewport = this.config.stealthMode.randomizeViewport
        ? amazonConfig.viewportSizes[Math.floor(Math.random() * amazonConfig.viewportSizes.length)]
        : { width: 1920, height: 1080 };

      // Select random user agent if enabled
      const userAgent = this.config.stealthMode.rotateUserAgent
        ? amazonConfig.userAgents[Math.floor(Math.random() * amazonConfig.userAgents.length)]
        : this.config.userAgent;

      console.log('Creating browser context...');
      // Create context with enhanced stealth settings
      this.context = await this.browser.newContext({
        userAgent,
        viewport,
        deviceScaleFactor: 1,
        hasTouch: false,
        isMobile: false,
        locale: 'en-US',
        timezoneId: 'America/New_York',
        geolocation: { longitude: -73.935242, latitude: 40.730610 }, // New York
        permissions: ['geolocation'],
        javaScriptEnabled: true,
        bypassCSP: true,
        ignoreHTTPSErrors: true,
        extraHTTPHeaders: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Sec-Ch-Ua': '"Chromium";v="122"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"Windows"',
          'Upgrade-Insecure-Requests': '1',
        },
      });

      // Try to load saved cookies
      await this.loadCookies();
      console.log('Browser context created');

      // Add enhanced stealth scripts
      if (this.config.stealthMode.useFingerprinting) {
        await this.context.addInitScript(() => {
          // Override navigator properties
          Object.defineProperty(navigator, 'webdriver', { get: () => false });
          
          // Add fake plugins
          Object.defineProperty(navigator, 'plugins', { 
            get: () => ({
              length: 5,
              refresh: () => {},
              item: () => {},
              namedItem: () => {},
              [Symbol.iterator]: function* () {
                yield { name: 'Chrome PDF Plugin' };
                yield { name: 'Chrome PDF Viewer' };
                yield { name: 'Native Client' };
                yield { name: 'Widevine Content Decryption Module' };
                yield { name: 'Microsoft Edge PDF Viewer' };
              }
            })
          });

          // Add fake languages
          Object.defineProperty(navigator, 'languages', { 
            get: () => ['en-US', 'en', 'es'] 
          });

          // Override canvas fingerprinting
          const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
          CanvasRenderingContext2D.prototype.getImageData = function(x, y, w, h) {
            const imageData = originalGetImageData.call(this, x, y, w, h);
            // Add slight random variations to pixel data
            for (let i = 0; i < imageData.data.length; i += 4) {
              imageData.data[i] = imageData.data[i] + Math.floor(Math.random() * 2);
            }
            return imageData;
          };

          // Override WebGL fingerprinting
          const getParameter = WebGLRenderingContext.prototype.getParameter;
          WebGLRenderingContext.prototype.getParameter = function(parameter) {
            // Spoof common WebGL parameters
            const spoofedParams: { [key: number]: any } = {
              37445: 'Intel Inc.', // UNMASKED_VENDOR_WEBGL
              37446: 'Intel Iris OpenGL Engine', // UNMASKED_RENDERER_WEBGL
              33902: 'ANGLE (Intel, Intel(R) Iris(TM) Graphics 6100, OpenGL 4.1)', // RENDERER
              33901: 'WebKit WebGL', // VENDOR
              34047: 'WebGL 2.0', // VERSION
              35724: 'WebGL GLSL ES 3.00', // SHADING_LANGUAGE_VERSION
            };
            return spoofedParams[parameter] || getParameter.call(this, parameter);
          };

          // Add random screen properties
          const screenProps = {
            width: window.innerWidth,
            height: window.innerHeight,
            availWidth: window.innerWidth,
            availHeight: window.innerHeight - 40,
            colorDepth: 24,
            pixelDepth: 24,
          };
          Object.defineProperties(screen, {
            width: { get: () => screenProps.width },
            height: { get: () => screenProps.height },
            availWidth: { get: () => screenProps.availWidth },
            availHeight: { get: () => screenProps.availHeight },
            colorDepth: { get: () => screenProps.colorDepth },
            pixelDepth: { get: () => screenProps.pixelDepth },
          });
        });
      }

      console.log('Creating new page...');
      this.page = await this.context.newPage();
      console.log('New page created');

      // Set default timeout
      this.page.setDefaultTimeout(this.config.timeout);
      console.log(`Page timeout set to ${this.config.timeout}ms`);

      // Ensure screenshot directory exists
      await fs.mkdir(this.config.screenshotDir, { recursive: true });
      console.log(`Screenshot directory created: ${this.config.screenshotDir}`);

      // Add event listeners for network activity
      this.page.on('request', request => {
        console.log(`🌐 Request: ${request.method()} ${request.url()}`);
      });
      this.page.on('response', response => {
        console.log(`📥 Response: ${response.status()} ${response.url()}`);
      });
      this.page.on('console', msg => {
        console.log(`🌍 Browser console: ${msg.text()}`);
      });

      // Add random mouse movements and scrolling
      if (this.config.stealthMode.simulateHumanBehavior) {
        await this.initializeHumanBehavior();
      }
    } catch (error) {
      console.error('Failed to initialize browser:', error);
      throw this.createError('Failed to initialize browser', 'UNKNOWN', error as Error);
    }
  }

  protected async checkSessionRotation(): Promise<void> {
    this.requestCount++;
    const sessionAge = Date.now() - this.sessionStartTime;

    if (
      this.requestCount >= this.config.maxRequestsPerSession ||
      sessionAge >= this.config.sessionRotationInterval
    ) {
      console.log('Rotating session...');
      await this.close();
      await this.initialize();
      this.requestCount = 0;
      this.sessionStartTime = Date.now();
    }
  }

  protected async handleRateLimit(): Promise<void> {
    const { min, max } = this.config.rateLimitDelay;
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    console.log(`Rate limit delay for ${delay}ms...`);
    await this.delay(delay);
  }

  private async initializeHumanBehavior(): Promise<void> {
    if (!this.page) return;

    await this.page.evaluate(() => {
      // Random scroll behavior
      const randomScroll = () => {
        const maxScroll = Math.max(
          document.documentElement.scrollHeight,
          document.body.scrollHeight
        );
        const targetY = Math.floor(Math.random() * maxScroll);
        
        // Smooth scroll with random speed
        const duration = Math.random() * 1000 + 500; // 500-1500ms
        const startY = window.scrollY;
        const startTime = performance.now();
        
        const scroll = (currentTime: number) => {
          const elapsed = currentTime - startTime;
          if (elapsed > duration) {
            window.scrollTo(0, targetY);
            return;
          }
          
          const progress = elapsed / duration;
          const easeInOut = progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;
          
          const currentY = startY + (targetY - startY) * easeInOut;
          window.scrollTo(0, currentY);
          requestAnimationFrame(scroll);
        };
        
        requestAnimationFrame(scroll);
      };

      // Random mouse movements
      const randomMouseMove = () => {
        const event = new MouseEvent('mousemove', {
          bubbles: true,
          cancelable: true,
          clientX: Math.random() * window.innerWidth,
          clientY: Math.random() * window.innerHeight,
        });
        document.dispatchEvent(event);
      };

      // Set up random intervals for human-like behavior
      setInterval(randomScroll, Math.random() * 5000 + 2000);
      setInterval(randomMouseMove, Math.random() * 3000 + 1000);
    });
  }

  private async loadCookies(): Promise<void> {
    try {
      const cookiesString = await fs.readFile(this.cookiesPath, 'utf8');
      const cookies = JSON.parse(cookiesString);
      await this.context!.addCookies(cookies);
      console.log('Loaded saved cookies successfully');
    } catch (error) {
      console.log('No existing cookies found or error loading cookies');
    }
  }

  private async saveCookies(): Promise<void> {
    try {
      const cookies = await this.context!.cookies();
      await fs.mkdir(path.dirname(this.cookiesPath), { recursive: true });
      await fs.writeFile(this.cookiesPath, JSON.stringify(cookies, null, 2));
      console.log('Saved cookies successfully');
    } catch (error) {
      console.error('Failed to save cookies:', error);
    }
  }

  protected async close(): Promise<void> {
    console.log('Closing browser resources...');
    if (this.context) {
      await this.saveCookies();
    }
    await this.page?.close();
    await this.context?.close();
    await this.browser?.close();
    this.page = null;
    this.context = null;
    this.browser = null;
    console.log('Browser resources closed');
  }

  protected async randomDelay(min: number = 1000, max: number = 5000): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min) + min);
    console.log(`Random delay for ${delay}ms...`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  protected async takeScreenshot(name: string): Promise<string> {
    if (!this.page) {
      throw this.createError('Browser not initialized', 'UNKNOWN');
    }

    console.log(`Taking screenshot: ${name}`);
    const fileName = `${name}-${Date.now()}.png`;
    const filePath = path.join(this.config.screenshotDir, fileName);
    await this.page.screenshot({ path: filePath, fullPage: true });
    console.log(`Screenshot saved: ${filePath}`);
    return filePath;
  }

  protected async retry<T>(
    operation: () => Promise<T>,
    retries = this.config.maxRetries
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`Attempt ${attempt}/${retries}`);
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.error(`Attempt ${attempt} failed:`, error);
        if (attempt < retries) {
          const delay = this.config.delay * Math.pow(2, attempt - 1);
          console.log(`Waiting ${delay}ms before retry...`);
          await this.delay(delay);
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
    console.error(`Creating error: ${message} (${type})`);
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
    console.log(`Delaying for ${ms}ms...`);
    await new Promise(resolve => setTimeout(resolve, ms));
    console.log('Delay completed');
  }

  protected abstract scrape(...args: any[]): Promise<any>;
} 