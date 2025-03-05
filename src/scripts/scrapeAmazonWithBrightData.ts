#!/usr/bin/env node
import { program } from 'commander';
import { BrightDataAmazonScraper } from '../scrapers/brightDataAmazon';
import fs from 'fs/promises';
import path from 'path';
import 'dotenv/config';

// Configure CLI
program
  .name('brightdata-amazon-scraper')
  .description('Scrape reviews from Amazon products using BrightData API')
  .requiredOption('-a, --asin <ASIN>', 'Amazon product ID (ASIN)')
  .option('-o, --output <path>', 'Output file path (default: ./data/[asin]-brightdata.json)')
  .option('-c, --count <number>', 'Number of reviews to fetch', '40')
  .option('-s, --sort <sort>', 'Sort reviews by (most_helpful, most_recent, top_critical, top_positive)', 'most_helpful')
  .option('-l, --language <code>', 'Language code (e.g., en)', 'en')
  .option('--country <code>', 'Country code (e.g., us)', 'us')
  .option('--rate-limit <ms>', 'Minimum time between API requests in milliseconds', '1000')
  .option('--max-retries <number>', 'Maximum number of retries for failed requests', '3')
  .option('--retry-delay <ms>', 'Delay between retry attempts in milliseconds', '2000')
  .option('--cache-ttl <ms>', 'Time-to-live for cached responses in milliseconds', '3600000')
  .option('--no-cache', 'Disable caching of API responses')
  .option('--batch <ASINs...>', 'Multiple ASINs to scrape in batch mode (comma-separated)')
  .parse(process.argv);

const options = program.opts();

async function scrapeProduct(asin: string) {
  const startTime = Date.now();
  console.log('\n=============================================');
  console.log(`Starting scrape for ASIN: ${asin}`);
  console.log('=============================================\n');
  
  try {
    // Create scraper instance with CLI options
    const scraper = new BrightDataAmazonScraper(
      {}, // Default scraper config
      {
        reviews_count: parseInt(options.count, 10),
        sort_by: options.sort as any,
        language: options.language,
        country: options.country,
        include_product_data: true,
        maxRetries: parseInt(options.maxRetries, 10),
        retryDelay: parseInt(options.retryDelay, 10),
      },
      parseInt(options.rateLimit, 10), // Rate limit
      options.cache ? parseInt(options.cacheTtl, 10) : 0 // Cache TTL (0 means no caching)
    );

    console.log('Starting API-based scraping process...');
    // Scrape reviews
    const result = await scraper.scrape(asin);

    // Prepare output
    const output = {
      ...result,
      metadata: {
        ...result.metadata,
        scrapeConfig: {
          reviewsCount: parseInt(options.count, 10),
          sortBy: options.sort,
          language: options.language,
          country: options.country,
          rateLimit: parseInt(options.rateLimit, 10),
          maxRetries: parseInt(options.maxRetries, 10),
          retryDelay: parseInt(options.retryDelay, 10),
          cachingEnabled: !!options.cache,
          cacheTTL: options.cache ? parseInt(options.cacheTtl, 10) : 0,
        },
      },
    };

    // Create output directory if it doesn't exist
    const outputDir = options.output ? 
      path.dirname(options.output.replace(`[asin]`, asin)) : 
      path.join('data');
    
    await fs.mkdir(outputDir, { recursive: true });

    // Generate output path with asin replacement if needed
    const outputPath = options.output ? 
      options.output.replace(`[asin]`, asin) : 
      path.join('data', `${asin}-brightdata.json`);

    // Write results to file
    await fs.writeFile(
      outputPath,
      JSON.stringify(output, null, 2),
      'utf-8'
    );

    // Print summary
    console.log('\nScraping completed successfully!');
    console.log('Summary:');
    console.log(`- Product: ${result.product.title}`);
    console.log(`- Total reviews available: ${result.metadata.totalReviews}`);
    console.log(`- Reviews scraped: ${result.metadata.scrapedReviews}`);
    console.log(`- Duration: ${(Date.now() - startTime) / 1000}s`);
    console.log(`- Output saved to: ${outputPath}`);
    
    return {
      success: true,
      asin,
      reviewsScraped: result.metadata.scrapedReviews,
      outputPath
    };
  } catch (error) {
    console.error('\nScraping failed:', error);
    return {
      success: false,
      asin,
      error
    };
  }
}

async function main() {
  const startTime = Date.now();
  
  console.log('BrightData Amazon Scraper Configuration:');
  console.log('---------------------------------------');
  console.log(`- ASIN(s): ${options.batch ? options.batch.join(', ') : options.asin}`);
  console.log(`- Reviews Count: ${options.count}`);
  console.log(`- Sort By: ${options.sort}`);
  console.log(`- Language: ${options.language}`);
  console.log(`- Country: ${options.country}`);
  console.log(`- Rate Limit: ${options.rateLimit}ms`);
  console.log(`- Max Retries: ${options.maxRetries}`);
  console.log(`- Retry Delay: ${options.retryDelay}ms`);
  console.log(`- Caching: ${options.cache ? 'Enabled' : 'Disabled'}`);
  if (options.cache) {
    console.log(`- Cache TTL: ${options.cacheTtl}ms (${options.cacheTtl / 3600000} hours)`);
  }
  console.log('---------------------------------------\n');
  
  try {
    // Validate environment variables
    if (!process.env.BRIGHTDATA_API_KEY) {
      throw new Error('BRIGHTDATA_API_KEY environment variable is required');
    }

    // Check if we're in batch mode
    if (options.batch && options.batch.length > 0) {
      console.log(`Running in batch mode for ${options.batch.length} ASINs`);
      
      const results = [];
      for (const asin of options.batch) {
        results.push(await scrapeProduct(asin));
      }
      
      // Print batch summary
      console.log('\n=============================================');
      console.log('Batch Processing Summary');
      console.log('=============================================');
      console.log(`Total ASINs processed: ${results.length}`);
      console.log(`Successful: ${results.filter(r => r.success).length}`);
      console.log(`Failed: ${results.filter(r => !r.success).length}`);
      console.log(`Total duration: ${(Date.now() - startTime) / 1000}s`);
      
      // List failed ASINs if any
      const failures = results.filter(r => !r.success);
      if (failures.length > 0) {
        console.log('\nFailed ASINs:');
        failures.forEach(f => console.log(`- ${f.asin}: ${f.error}`));
        process.exit(1);
      }
      
      process.exit(0);
    } else {
      // Single ASIN mode
      const result = await scrapeProduct(options.asin);
      process.exit(result.success ? 0 : 1);
    }
  } catch (error) {
    console.error('\nScript execution failed:', error);
    process.exit(1);
  }
}

main(); 