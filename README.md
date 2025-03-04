# Reviews Analyzer

A Multi-Platform Review Intelligence tool for scraping and analyzing product reviews from various e-commerce platforms using AI.

## Features

- Scrape product reviews from Amazon and Walmart
- Extract review data using OpenAI's Vision API
- Store and analyze review data
- Handle rate limiting and anti-bot measures
- Structured data output for analysis

## Prerequisites

- Node.js (v16 or higher)
- MongoDB
- OpenAI API key
- (Optional) Proxy server for enhanced scraping capabilities

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

Amazon products:
```bash
npm run scrape:amazon -- --asin <ASIN>
```

Walmart products:
```bash
npm run scrape:walmart -- --id <PRODUCT_ID>
```

## Project Structure

```
reviews-analyzer/
├── src/
│   ├── scrapers/     # Scraping modules for different platforms
│   ├── vision/       # OpenAI Vision API integration
│   ├── db/           # Database operations
│   ├── utils/        # Helper functions
│   └── config/       # Configuration files
├── tests/            # Test files
├── scripts/          # Utility scripts
└── logs/            # Application logs
```

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