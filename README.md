# DigitalOcean Spaces Downloader

A Node.js script to efficiently download files from DigitalOcean Spaces with features like:
- Parallel downloads with concurrency control
- Progress tracking
- Resume capability
- Streaming downloads (memory efficient)

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

3. Run the script:
```bash
node index.js
```

## Features

- Downloads files in parallel (configurable concurrency)
- Shows progress for each download
- Skips already downloaded files
- Streams files directly to disk (low memory usage)
- Cleans up partial downloads on failure
- Maintains original directory structure in `files/` directory

## Configuration

You can adjust the `MAX_CONCURRENT_DOWNLOADS` constant in `index.js` to control how many files are downloaded simultaneously. Default is 5.

## Environment Variables

- `SPACES_KEY`: Your DigitalOcean Spaces Access Key
- `SPACES_SECRET`: Your DigitalOcean Spaces Secret Key
- `SPACES_BUCKET`: Your Space (bucket) name
- `SPACES_REGION`: Region where your Space is located (e.g., sgp1, nyc3)
