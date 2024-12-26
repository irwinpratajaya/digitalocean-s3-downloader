# DigitalOcean Spaces Downloader

A TypeScript script to efficiently download files from DigitalOcean Spaces with features like:
- Parallel downloads with concurrency control
- Progress tracking
- Resume capability
- Streaming downloads (memory efficient)
- Type safety with TypeScript

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
# Copy the example env file
cp .env.example .env

# Edit .env with your DigitalOcean Spaces credentials
nano .env  # or use your preferred editor
```

3. Build and run the script:
```bash
# Build TypeScript
npm run build

# Run the compiled code
npm start

# Or build and run in one command
npm run dev
```

## Development

- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run the compiled JavaScript
- `npm run dev` - Build and run in one command
- `npm run watch` - Watch for changes and recompile

## Features

- Downloads files in parallel (configurable concurrency)
- Shows progress for each download
- Skips already downloaded files
- Streams files directly to disk (low memory usage)
- Cleans up partial downloads on failure
- Maintains original directory structure in `files/` directory
- Type-safe with TypeScript

## Configuration

You can adjust the `MAX_CONCURRENT_DOWNLOADS` constant in `src/index.ts` to control how many files are downloaded simultaneously. Default is 5.

## Environment Variables

- `SPACES_KEY`: Your DigitalOcean Spaces Access Key
- `SPACES_SECRET`: Your DigitalOcean Spaces Secret Key
- `SPACES_BUCKET`: Your Space (bucket) name
- `SPACES_REGION`: Region where your Space is located (e.g., sgp1, nyc3)

## TypeScript Features

- Strong typing for AWS S3 operations
- Interface definitions for Space files and environment variables
- Type-safe error handling
- Proper type definitions for streams and async operations
