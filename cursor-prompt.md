# Build a Multi-Platform Review Intelligence MVP

I need your help creating a Minimum Viable Product for a Multi-Platform Review Intelligence tool. This tool will scrape product reviews from e-commerce sites (Amazon and Walmart initially), extract the review data using OpenAI's Vision API, and store the results in a database. This is for a solo entrepreneur project where I'll start with a manual service approach.

## Project Setup

First, help me set up the project structure:

1. Create a basic folder structure for the project
2. Initialize a Node.js project
3. Add required dependencies (Playwright, OpenAI API, MongoDB, dotenv, etc.)
4. Create a .env file template
5. Set up a basic .gitignore file

## Amazon Review Scraper

Next, create a module that can scrape Amazon product reviews:

1. Implement a function that takes an ASIN (Amazon product ID) as input
2. Navigate to the product page and then to the reviews section
3. Handle the 40-review limitation for non-logged-in users by extracting the most helpful reviews
4. Capture screenshots of the review sections (we'll use Vision AI to extract data)
5. Add error handling, retries, and proxy support
6. Add functionality to extract basic product info (title, price, rating)

Consider that Amazon limits unauthenticated scrapers to about 40 reviews, so optimize for quality over quantity.

## Walmart Review Scraper

Next, implement a similar module for Walmart:

1. Create a function that takes a Walmart product ID
2. Navigate to the product page and reviews section
3. Capture screenshots of the review sections
4. Extract basic product information
5. Include error handling and rate limiting

## Vision API Integration

Create a module to process the captured screenshots:

1. Implement a function that takes a screenshot and sends it to OpenAI's Vision API
2. Create an effective prompt for GPT-4 Vision to extract structured review data (rating, title, text, date, etc.)
3. Parse the JSON response and return structured data
4. Add error handling and retry logic

## Database Integration

Create a module to store the extracted data:

1. Implement a MongoDB connection (or Airtable if preferred)
2. Create schemas/models for products and reviews
3. Implement functions to save and retrieve review data
4. Add functionality to track which products have been analyzed and when

## Main Application Logic

Finally, tie everything together:

1. Create a main script that orchestrates the entire process
2. Implement command-line arguments to scrape a specific product
3. Add logging for tracking progress and errors
4. Create a simple scheduling system for re-analyzing products periodically

## Testing & Execution

Finally, help me test the application:

1. Create a simple test script for validating each component
2. Provide a list of sample product IDs for testing (both Amazon and Walmart)
3. Add console output to show progress and results

Please implement this step by step, focusing on clean, maintainable code with proper error handling. Let's start with the project setup and Amazon scraper first, then move on to the other components.
