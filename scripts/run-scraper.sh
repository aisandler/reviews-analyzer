#!/bin/bash

# Set environment variables
export USER_AGENT="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
export SCRAPE_DELAY=2000
export MAX_RETRIES=3
export BRIGHTDATA_WS_ENDPOINT="wss://brd-customer-hl_31b58fb8-zone-scraping_browser1:98wwnm9s5ti0@brd.superproxy.io:9222"

# Create necessary directories
mkdir -p screenshots
mkdir -p cookies
mkdir -p data

# Compile TypeScript
echo "Compiling TypeScript..."
npx tsc

# Run the compiled JavaScript
echo "Running scraper..."
node dist/scripts/scrapeAmazon.js "$@" 