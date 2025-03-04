#!/usr/bin/env node
import { program } from 'commander';
import { AmazonScraper } from '../scrapers/amazon';
import fs from 'fs/promises';
import path from 'path';

// Configure CLI
program
  .name('amazon-scraper')
  .description('Scrape reviews from Amazon products')
  .requiredOption('-a, --asin <ASIN>', 'Amazon product ID (ASIN)')
  .option('-o, --output <path>', 'Output file path (default: ./data/[asin].json)')
  .option('-p, --proxy <url>', 'Proxy server URL')
  .option('-d, --delay <ms>', 'Delay between requests in milliseconds', '2000')
  .option('-r, --retries <number>', 'Maximum number of retry attempts', '3')
  .parse(process.argv);

const options = program.opts();

async function main() {
  const startTime = Date.now();
  console.log(`Starting scrape for ASIN: ${options.asin}`);

  try {
    // Create scraper instance with CLI options
    const scraper = new AmazonScraper({
      proxyServer: options.proxy,
      delay: parseInt(options.delay, 10),
      maxRetries: parseInt(options.retries, 10),
    });

    // Scrape reviews
    const result = await scraper.scrape(options.asin);

    // Prepare output
    const output = {
      ...result,
      metadata: {
        ...result.metadata,
        scrapeConfig: {
          proxy: !!options.proxy,
          delay: parseInt(options.delay, 10),
          retries: parseInt(options.retries, 10),
        },
      },
    };

    // Create output directory if it doesn't exist
    const outputPath = options.output || path.join('data', `${options.asin}.json`);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

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

  } catch (error: any) {
    console.error('Error:', error.message);
    if (error.metadata) {
      console.error('Error metadata:', error.metadata);
    }
    process.exit(1);
  }
}

main(); 