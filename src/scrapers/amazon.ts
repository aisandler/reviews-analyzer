import { BaseScraper } from './base';
import { Product, Review, ReviewScrapeResult } from '../types';
import { amazonConfig } from '../config';
import { ElementHandle } from 'playwright';

export class AmazonScraper extends BaseScraper {
  private async navigateToReviews(asin: string): Promise<void> {
    if (!this.page) throw this.createError('Browser not initialized', 'UNKNOWN');

    const url = `${amazonConfig.baseUrl}${amazonConfig.reviewsPath}/${asin}`;
    await this.retry(async () => {
      try {
        await this.page!.goto(url, { waitUntil: 'networkidle' });
        
        // Check for robot check
        const robotCheck = await this.page!.$('form[action="/errors/validateCaptcha"]');
        if (robotCheck) {
          throw this.createError('Robot check detected', 'BLOCKED');
        }
      } catch (error: any) {
        throw this.createError(
          `Failed to navigate to reviews page: ${error.message}`,
          'NETWORK',
          error instanceof Error ? error : new Error(String(error))
        );
      }
    });
  }

  private async extractProductInfo(asin: string): Promise<Product> {
    if (!this.page) throw this.createError('Browser not initialized', 'UNKNOWN');

    return await this.retry(async () => {
      try {
        const title = await this.page!.textContent(amazonConfig.selectors.productTitle) || '';
        const priceText = await this.page!.textContent(amazonConfig.selectors.price) || '0';
        const ratingText = await this.page!.textContent(amazonConfig.selectors.rating) || '0 out of 5';
        const totalReviewsText = await this.page!.textContent(amazonConfig.selectors.totalReviews) || '0';

        // Parse price (remove currency symbol and convert to number)
        const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));

        // Parse rating (extract number from "X out of 5" format)
        const rating = parseFloat(ratingText.split(' ')[0]);

        // Parse total reviews (remove "ratings" text and convert to number)
        const totalReviews = parseInt(totalReviewsText.replace(/[^0-9]/g, ''), 10);

        return {
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
          platform: 'amazon',
        };
      } catch (error: any) {
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
      // Extract basic review information
      const title = await card.$eval(selectors.reviewTitle, el => el.textContent || '');
      const text = await card.$eval(selectors.reviewText, el => el.textContent || '');
      const ratingText = await card.$eval(selectors.reviewRating, el => el.textContent || '');
      const dateText = await card.$eval(selectors.reviewDate, el => el.textContent || '');
      const author = await card.$eval(selectors.reviewAuthor, el => el.textContent || '');

      // Extract rating number from text (e.g., "5.0 out of 5 stars" -> 5)
      const rating = parseFloat(ratingText.split(' ')[0]);

      // Parse date (format: "Reviewed in the United States on January 1, 2024")
      const dateMatch = dateText.match(/on (.+)$/);
      const date = dateMatch ? new Date(dateMatch[1]) : new Date();

      // Check for verified purchase badge
      const verified = await card.$(selectors.verifiedPurchase)
        .then(el => !!el)
        .catch(() => false);

      // Extract helpful votes
      const helpfulText = await card.$eval(
        selectors.helpfulVotes,
        el => el.textContent || ''
      ).catch(() => '');
      const votesMatch = helpfulText.match(/(\d+)/);
      const votes = votesMatch ? parseInt(votesMatch[1], 10) : 0;

      // Get review images if any
      const imageUrls = await card.$$eval(
        selectors.reviewImages,
        elements => elements.map(el => (el as HTMLImageElement).src)
      ).catch(() => []);

      return {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Generate a unique ID
        title: title.trim(),
        text: text.trim(),
        rating,
        date,
        verified,
        helpful: { votes },
        author: { name: author.trim() },
        images: imageUrls,
        platform: 'amazon',
        productId: '', // Will be set by the scrape method
      };
    } catch (error: any) {
      throw this.createError(
        `Failed to extract review data: ${error.message}`,
        'PARSING',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  public async scrape(asin: string): Promise<ReviewScrapeResult> {
    const startTime = Date.now();
    let product: Product;
    const reviews: Review[] = [];

    try {
      await this.initialize();
      await this.navigateToReviews(asin);

      // Extract product information
      product = await this.extractProductInfo(asin);

      // Take screenshot of the reviews section
      const screenshotPath = await this.takeScreenshot(`amazon-${asin}-reviews`);

      // Extract reviews from the page
      const reviewCards = await this.page!.$$(amazonConfig.selectors.reviewCards);
      
      for (const card of reviewCards) {
        try {
          const review = await this.extractReviewFromCard(card);
          review.productId = asin;
          reviews.push(review);
        } catch (error) {
          console.error('Failed to extract review:', error);
          continue;
        }
      }

      return {
        product,
        reviews,
        metadata: {
          scrapedAt: new Date(),
          totalReviews: product.rating.total,
          scrapedReviews: reviews.length,
          duration: Date.now() - startTime,
        },
      };
    } catch (error: any) {
      throw this.createError(
        `Failed to scrape Amazon reviews: ${error.message}`,
        'UNKNOWN',
        error instanceof Error ? error : new Error(String(error))
      );
    } finally {
      await this.close();
    }
  }
} 