# Reviews Analyzer

A Multi-Platform Review Intelligence tool for scraping and analyzing product reviews from various e-commerce platforms using AI.

## Features

- Scrape product reviews from Amazon and Walmart
- Use BrightData's specialized Amazon Scraper API for reliable Amazon reviews extraction
- Extract review data using OpenAI's Vision API
- Store and analyze review data
- Handle rate limiting and anti-bot measures
- Structured data output for analysis

## Prerequisites

- Node.js (v16 or higher)
- MongoDB
- OpenAI API key
- BrightData API key for the Amazon Scraper API
- (Optional) BrightData Scraping Browser for legacy scraping

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd reviews-analyzer
```

2. Install dependencies:
```bash
npm install
```

3. Copy the environment template and fill in your values:
```bash
cp .env.template .env
```

4. Configure your environment variables in `.env`

## Usage

### Starting the Application

Development mode with hot reloading:
```bash
npm run dev
```

Production mode:
```bash
npm run build
npm start
```

### Scraping Reviews

#### Amazon Products

Using BrightData's Amazon Scraper API (recommended):
```bash
npm run scrape:amazon:brightdata -- --asin <ASIN> --count <NUMBER_OF_REVIEWS> --sort <SORT_METHOD>
```

##### Basic Options:
- `--asin`: Amazon product ID (required)
- `--count`: Number of reviews to fetch (default: 40)
- `--sort`: Sort method (most_helpful, most_recent, top_critical, top_positive) (default: most_helpful)
- `--language`: Language code (default: en)
- `--country`: Country code (default: us)
- `--output`: Output file path (default: ./data/<ASIN>-brightdata.json)

##### Advanced Options:
- `--rate-limit <ms>`: Minimum time between API requests in milliseconds (default: 1000)
- `--max-retries <number>`: Maximum number of retries for failed requests (default: 3)
- `--retry-delay <ms>`: Delay between retry attempts in milliseconds (default: 2000)
- `--cache-ttl <ms>`: Time-to-live for cached responses in milliseconds (default: 3600000 - 1 hour)
- `--no-cache`: Disable caching of API responses

##### Batch Processing:
```bash
npm run scrape:amazon:brightdata -- --batch B00EXAMPLE1 B00EXAMPLE2 B00EXAMPLE3
```

You can also use the `--output` option with a placeholder to generate unique filenames:
```bash
npm run scrape:amazon:brightdata -- --batch B00EXAMPLE1 B00EXAMPLE2 --output "./data/[asin]-reviews.json"
```

Using legacy browser-based scraping:
```bash
npm run scrape:amazon -- --asin <ASIN>
```

#### Walmart Products

```bash
npm run scrape:walmart -- --id <PRODUCT_ID>
```

## Project Structure

```
reviews-analyzer/
├── src/
│   ├── scrapers/     # Scraping modules for different platforms
│   ├── services/     # Service integrations (BrightData API, etc.)
│   ├── vision/       # OpenAI Vision API integration
│   ├── db/           # Database operations
│   ├── utils/        # Helper functions
│   └── config/       # Configuration files
├── tests/            # Test files
├── scripts/          # Utility scripts
└── logs/             # Application logs
```

## BrightData Integration

This project supports two methods for scraping Amazon reviews:

1. **BrightData Amazon Scraper API (Recommended)**:
   - Uses BrightData's specialized API for Amazon reviews
   - More reliable and less likely to be blocked
   - Faster and more efficient
   - Returns structured data without requiring complex parsing
   - Requires a BrightData API key
   - Enhanced with:
     - Retry mechanism for handling transient errors
     - In-memory caching to reduce API calls
     - Rate limiting to prevent API throttling
     - Batch processing for multiple products

2. **Browser-based Scraping (Legacy)**:
   - Uses BrightData's Scraping Browser
   - More complex and prone to being blocked
   - Requires more maintenance
   - Can be useful for other platforms without dedicated APIs

To use the BrightData Amazon Scraper API, ensure you've set the `BRIGHTDATA_API_KEY` in your `.env` file.

### Performance Considerations

When using the BrightData Amazon Scraper API:

1. **API Rate Limits**: 
   - Use the `--rate-limit` option to control request frequency
   - Default is 1 request per second (1000ms)

2. **Caching**:
   - Responses are cached in memory to reduce API calls
   - Set cache TTL with `--cache-ttl` option (default: 1 hour)
   - Disable caching with `--no-cache` if needed

3. **Error Handling**:
   - Automatic retries for transient errors (network issues, rate limits)
   - Configure with `--max-retries` and `--retry-delay` options

4. **Batch Processing**:
   - Process multiple products in a single run with `--batch` option
   - Each product is processed sequentially with rate limiting applied

## Testing

Run tests:
```bash
npm test
```

Watch mode:
```bash
npm run test:watch
```

## License

ISC 