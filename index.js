const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');
require('dotenv').config();

const accessKeyId = process.env.SPACES_KEY;
const secretAccessKey = process.env.SPACES_SECRET;
const bucket = process.env.SPACES_BUCKET;
const region = process.env.SPACES_REGION;

// Concurrency control - adjust based on your needs
const MAX_CONCURRENT_DOWNLOADS = 5;

const s3 = new AWS.S3({
  endpoint: `https://${region}.digitaloceanspaces.com`,
  accessKeyId,
  secretAccessKey,
  region,
  s3ForcePathStyle: false,
});

async function listObjects() {
  const params = {
    Bucket: bucket,
  };

  try {
    const data = await s3.listObjects(params).promise();
    console.log("Found", data.Contents.length, "files");
    return data.Contents
      .filter(obj => obj.Size > 0)
      .map(obj => ({
        Key: obj.Key,
        Size: obj.Size
      }));
  } catch (err) {
    console.error('Error listing bucket contents:', err);
    process.exit(1);
  }
}

async function downloadFile(file) {
  const { Key: filePath, Size: totalSize } = file;
  const downloadPath = path.join('files', filePath);
  const dir = path.dirname(downloadPath);

  try {
    // Create directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Skip if file exists and has the same size
    if (fs.existsSync(downloadPath)) {
      const stats = fs.statSync(downloadPath);
      if (stats.size === totalSize) {
        console.log(`Skipping ${downloadPath} (already exists)`);
        return;
      }
    }

    const params = {
      Bucket: bucket,
      Key: filePath,
    };

    // Create read stream from S3
    const readStream = s3.getObject(params).createReadStream();
    const writeStream = fs.createWriteStream(downloadPath);

    let downloadedBytes = 0;
    readStream.on('data', (chunk) => {
      downloadedBytes += chunk.length;
      const progress = ((downloadedBytes / totalSize) * 100).toFixed(1);
      process.stdout.write(`\rDownloading ${filePath}: ${progress}% (${downloadedBytes}/${totalSize} bytes)`);
    });

    // Use pipeline for proper error handling and cleanup
    await pipeline(readStream, writeStream);
    console.log(`\nCompleted: ${downloadPath}`);
  } catch (err) {
    console.error(`\nError downloading file ${filePath}:`, err);
    // Delete partial file if download failed
    if (fs.existsSync(downloadPath)) {
      fs.unlinkSync(downloadPath);
    }
  }
}

async function downloadBatch(files) {
  const queue = [...files];
  const inProgress = new Set();
  const results = [];

  while (queue.length > 0 || inProgress.size > 0) {
    // Fill up to max concurrent downloads
    while (queue.length > 0 && inProgress.size < MAX_CONCURRENT_DOWNLOADS) {
      const file = queue.shift();
      const promise = downloadFile(file)
        .then(() => {
          inProgress.delete(promise);
        })
        .catch((err) => {
          console.error(`Failed to download ${file.Key}:`, err);
          inProgress.delete(promise);
        });
      inProgress.add(promise);
      results.push(promise);
    }

    // Wait for at least one download to complete
    if (inProgress.size > 0) {
      await Promise.race(inProgress);
    }
  }

  // Wait for all downloads to complete
  await Promise.all(results);
}

async function main() {
  try {
    const files = await listObjects();
    console.log(`Starting download of ${files.length} files...`);
    await downloadBatch(files);
    console.log('\nSuccess! All files downloaded :-)');
  } catch (err) {
    console.error('Error in main execution:', err);
  }
}

main();
