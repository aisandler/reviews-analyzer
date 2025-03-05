import { BaseScraper } from './base';
import { Product, Review, ReviewScrapeResult } from '../types';
import { amazonConfig } from '../config';
import { ElementHandle } from 'playwright';

export class AmazonScraper extends BaseScraper {
  private async navigateToReviews(asin: string): Promise<void> {
    if (!this.page) throw this.createError('Browser not initialized', 'UNKNOWN');

    // Try mobile URL first
    const mobileUrl = `${amazonConfig.baseUrl}/gp/aw/reviews/${asin}`;
    const desktopUrl = `${amazonConfig.baseUrl}${amazonConfig.reviewsPath}/${asin}`;
    
    console.log('Attempting to access reviews via mobile endpoint...');
    
    await this.retry(async () => {
      try {
        // Add random delay before navigation
        await this.randomDelay(2000, 5000);
        
        // Set mobile user agent
        await this.context!.setExtraHTTPHeaders({
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Sec-Ch-Ua': '"Not A(Brand";v="99", "Chromium";v="122"',
          'Sec-Ch-Ua-Mobile': '?1',
          'Sec-Ch-Ua-Platform': '"Android"',
          'Upgrade-Insecure-Requests': '1',
        });

        // Try mobile URL first
        console.log(`Navigating to mobile reviews page: ${mobileUrl}`);
        await this.page!.goto(mobileUrl, { 
          waitUntil: 'domcontentloaded',
          timeout: this.config.timeout 
        });

        // Add random delay after navigation
        await this.randomDelay(1000, 3000);

        // Check if we're blocked on mobile
        const isMobileBlocked = await this.checkForBlocks();
        
        if (isMobileBlocked) {
          console.log('Mobile access blocked, trying desktop URL...');
          
          // Switch to desktop user agent
          await this.context!.setExtraHTTPHeaders({
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Sec-Ch-Ua': '"Chromium";v="122"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"',
            'Upgrade-Insecure-Requests': '1',
          });

          // Try desktop URL
          console.log(`Navigating to desktop reviews page: ${desktopUrl}`);
          await this.page!.goto(desktopUrl, { 
            waitUntil: 'domcontentloaded',
            timeout: this.config.timeout 
          });

          // Add random delay after navigation
          await this.randomDelay(1000, 3000);
          
          // Check for blocks again
          await this.checkForBlocks();
        }

        // Simulate human behavior
        await this.simulateHumanBehavior();
        
        // Sort by most helpful if possible
        await this.sortByMostHelpful();

        // Verify we're on the correct page
        const productTitle = await this.page!.textContent(amazonConfig.selectors.productTitle);
        if (!productTitle) {
          throw this.createError('Failed to verify product page', 'PARSING');
        }

        console.log('Page loaded and verified successfully');
      } catch (error: any) {
        if (error.type === 'BLOCKED') {
          throw error; // Don't retry if we're blocked
        }
        throw this.createError(
          `Failed to navigate to reviews page: ${error.message}`,
          'NETWORK',
          error instanceof Error ? error : new Error(String(error))
        );
      }
    });
  }

  private async sortByMostHelpful(): Promise<void> {
    try {
      // Wait for sort dropdown with random delay
      await this.randomDelay(1000, 2000);
      
      // Check if sort dropdown exists and click it
      const sortDropdown = await this.page!.$('#sort-order-dropdown');
      if (sortDropdown) {
        await sortDropdown.click();
        await this.randomDelay(500, 1500);
        
        // Click the "most helpful" option
        await this.page!.click('option[value="helpful"]');
        await this.page!.waitForLoadState('networkidle');
        console.log('Sorted reviews by most helpful');
      } else {
        console.log('Sort dropdown not found, continuing with default sort');
      }
    } catch (error) {
      console.log('Failed to sort by most helpful:', error);
      // Continue anyway as this is not critical
    }
  }

  private async checkForBlocks(): Promise<boolean> {
    console.log('Checking for robot detection and blocks...');

    // Take screenshot for debugging
    await this.takeScreenshot('check-blocks');

    // Check for robot check
    const robotCheck = await this.page!.$('form[action="/errors/validateCaptcha"]');
    if (robotCheck) {
      console.error('Robot check detected!');
      throw this.createError('Robot check detected', 'BLOCKED');
    }

    // Check for other common blocking patterns
    const possibleBlocks = [
      'To discuss automated access to Amazon data please contact',
      'Sorry, we just need to make sure you\'re not a robot',
      'Enter the characters you see below',
      'Your request could not be completed',
      'Why have I been blocked?',
      'not a robot',
      'Bot Check',
      'Type the characters you see in this image',
      'Enter the characters you see below',
    ];

    const pageContent = await this.page!.content();
    for (const blockText of possibleBlocks) {
      if (pageContent.includes(blockText)) {
        console.error(`Blocking pattern detected: ${blockText}`);
        throw this.createError('Access blocked by Amazon', 'BLOCKED');
      }
    }

    // Check for redirect to sign-in page
    const currentUrl = this.page!.url();
    if (currentUrl.includes('/signin') || currentUrl.includes('/ap/signin')) {
      console.error('Redirected to sign-in page');
      throw this.createError('Sign-in required', 'BLOCKED');
    }

    // Check for unusual response codes or content
    const response = await this.page!.evaluate(() => ({
      status: document.title,
      body: document.body.innerText
    }));

    if (
      response.status.includes('Robot Check') ||
      response.status.includes('Sorry!') ||
      response.status.includes('404') ||
      response.body.includes('automated access') ||
      response.body.includes('unusual activity')
    ) {
      console.error('Suspicious page content detected');
      throw this.createError('Suspicious response detected', 'BLOCKED');
    }

    console.log('No blocks detected');
    return false;
  }

  private async simulateHumanBehavior(): Promise<void> {
    console.log('Simulating human behavior...');

    // Random scroll behavior with smooth scrolling
    const scrolls = Math.floor(Math.random() * 3) + 2; // 2-4 scrolls
    for (let i = 0; i < scrolls; i++) {
      const scrollAmount = Math.floor(Math.random() * 500) + 200;
      await this.page!.evaluate((amount) => {
        window.scrollBy({
          top: amount,
          behavior: 'smooth'
        });
      }, scrollAmount);
      await this.randomDelay(500, 1500);
    }

    // Random mouse movements
    const moves = Math.floor(Math.random() * 3) + 2; // 2-4 moves
    for (let i = 0; i < moves; i++) {
      const x = Math.floor(Math.random() * 800);
      const y = Math.floor(Math.random() * 600);
      await this.page!.mouse.move(x, y, {
        steps: 10 // Make movement more natural with steps
      });
      await this.randomDelay(200, 700);
    }

    // Occasionally click on non-interactive elements
    if (Math.random() > 0.7) {
      const paragraphs = await this.page!.$$('p');
      if (paragraphs.length > 0) {
        const randomParagraph = paragraphs[Math.floor(Math.random() * paragraphs.length)];
        await randomParagraph.click();
        await this.randomDelay(500, 1000);
      }
    }
  }

  private async extractProductInfo(asin: string): Promise<Product> {
    if (!this.page) throw this.createError('Browser not initialized', 'UNKNOWN');

    return await this.retry(async () => {
      try {
        console.log('Extracting product information...');
        
        console.log('Getting product title...');
        const title = await this.page!.textContent(amazonConfig.selectors.productTitle) || '';
        console.log(`Title found: ${title.trim()}`);

        console.log('Getting product price...');
        const priceText = await this.page!.textContent(amazonConfig.selectors.price) || '0';
        console.log(`Price found: ${priceText}`);

        console.log('Getting product rating...');
        const ratingText = await this.page!.textContent(amazonConfig.selectors.rating) || '0 out of 5';
        console.log(`Rating found: ${ratingText}`);

        console.log('Getting total reviews count...');
        const totalReviewsText = await this.page!.textContent(amazonConfig.selectors.totalReviews) || '0';
        console.log(`Total reviews found: ${totalReviewsText}`);

        // Parse price (remove currency symbol and convert to number)
        const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));

        // Parse rating (extract number from "X out of 5" format)
        const rating = parseFloat(ratingText.split(' ')[0]);

        // Parse total reviews (remove "ratings" text and convert to number)
        const totalReviews = parseInt(totalReviewsText.replace(/[^0-9]/g, ''), 10);

        const product: Product = {
          id: asin,
          title: title.trim(),
          price: {
            current: price,
            currency: 'USD', // Default to USD, could be made more dynamic
          },
          rating: {
            average: rating,
            total: totalReviews,
          },
          url: `${amazonConfig.baseUrl}/dp/${asin}`,
          platform: 'amazon' as const,
        };

        console.log('Product information extracted successfully:', product);
        return product;
      } catch (error: any) {
        console.error('Failed to extract product info:', error);
        throw this.createError(
          `Failed to extract product info: ${error.message}`,
          'PARSING',
          error instanceof Error ? error : new Error(String(error))
        );
      }
    });
  }

  private async extractReviewFromCard(card: ElementHandle): Promise<Review> {
    const selectors = amazonConfig.selectors;

    try {
      console.log('Extracting review from card...');

      // Extract basic review information
      console.log('Getting review title...');
      const title = await card.$eval(selectors.reviewTitle, el => el.textContent || '');
      console.log(`Review title found: ${title.trim()}`);

      console.log('Getting review text...');
      const text = await card.$eval(selectors.reviewText, el => el.textContent || '');
      console.log(`Review text found: ${text.length} characters`);

      console.log('Getting review rating...');
      const ratingText = await card.$eval(selectors.reviewRating, el => el.textContent || '');
      console.log(`Review rating found: ${ratingText}`);

      console.log('Getting review date...');
      const dateText = await card.$eval(selectors.reviewDate, el => el.textContent || '');
      console.log(`Review date found: ${dateText}`);

      console.log('Getting review author...');
      const author = await card.$eval(selectors.reviewAuthor, el => el.textContent || '');
      console.log(`Review author found: ${author.trim()}`);

      // Extract rating number from text (e.g., "5.0 out of 5 stars" -> 5)
      const rating = parseFloat(ratingText.split(' ')[0]);

      // Parse date (format: "Reviewed in the United States on January 1, 2024")
      const dateMatch = dateText.match(/on (.+)$/);
      const date = dateMatch ? new Date(dateMatch[1]) : new Date();

      // Check for verified purchase badge
      console.log('Checking for verified purchase badge...');
      const verified = await card.$(selectors.verifiedPurchase)
        .then(el => !!el)
        .catch(() => false);
      console.log(`Verified purchase: ${verified}`);

      // Extract helpful votes
      console.log('Getting helpful votes...');
      const helpfulText = await card.$eval(
        selectors.helpfulVotes,
        el => el.textContent || ''
      ).catch(() => '');
      const votesMatch = helpfulText.match(/(\d+)/);
      const votes = votesMatch ? parseInt(votesMatch[1], 10) : 0;
      console.log(`Helpful votes found: ${votes}`);

      // Get review images if any
      console.log('Getting review images...');
      const imageUrls = await card.$$eval(
        selectors.reviewImages,
        elements => elements.map(el => (el as HTMLImageElement).src)
      ).catch(() => []);
      console.log(`Review images found: ${imageUrls.length}`);

      const review: Review = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Generate a unique ID
        title: title.trim(),
        text: text.trim(),
        rating,
        date,
        verified,
        helpful: { votes },
        author: { name: author.trim() },
        images: imageUrls,
        platform: 'amazon' as const,
        productId: '', // Will be set by the scrape method
      };

      console.log('Review extracted successfully');
      return review;
    } catch (error: any) {
      console.error('Failed to extract review:', error);
      throw this.createError(
        `Failed to extract review data: ${error.message}`,
        'PARSING',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  public async scrape(asin: string): Promise<ReviewScrapeResult> {
    console.log(`Starting Amazon scrape for ASIN: ${asin}`);
    const startTime = Date.now();
    let product: Product;
    const reviews: Review[] = [];

    try {
      console.log('Initializing browser...');
      await this.initialize();

      console.log('Navigating to reviews page...');
      await this.navigateToReviews(asin);

      console.log('Extracting product information...');
      product = await this.extractProductInfo(asin);

      console.log('Taking screenshot of reviews section...');
      const screenshotPath = await this.takeScreenshot(`amazon-${asin}-reviews`);
      console.log(`Screenshot saved to: ${screenshotPath}`);

      console.log('Finding review cards...');
      const reviewCards = await this.page!.$$(amazonConfig.selectors.reviewCards);
      console.log(`Found ${reviewCards.length} review cards`);
      
      for (let i = 0; i < reviewCards.length; i++) {
        try {
          console.log(`\nProcessing review ${i + 1}/${reviewCards.length}`);
          const review = await this.extractReviewFromCard(reviewCards[i]);
          review.productId = asin;
          reviews.push(review);
          console.log(`Review ${i + 1} processed successfully`);
        } catch (error) {
          console.error(`Failed to process review ${i + 1}:`, error);
          continue;
        }
      }

      const result = {
        product,
        reviews,
        metadata: {
          scrapedAt: new Date(),
          totalReviews: product.rating.total,
          scrapedReviews: reviews.length,
          duration: Date.now() - startTime,
        },
      };

      console.log('\nScraping completed successfully');
      console.log('Summary:', {
        productTitle: product.title,
        totalReviews: product.rating.total,
        scrapedReviews: reviews.length,
        duration: `${(Date.now() - startTime) / 1000}s`,
      });

      return result;
    } catch (error: any) {
      console.error('Scraping failed:', error);
      throw this.createError(
        `Failed to scrape Amazon reviews: ${error.message}`,
        'UNKNOWN',
        error instanceof Error ? error : new Error(String(error))
      );
    } finally {
      console.log('Cleaning up browser resources...');
      await this.close();
    }
  }
} 