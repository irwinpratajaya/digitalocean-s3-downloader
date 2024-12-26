import AWS from 'aws-sdk';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Type definitions
interface SpaceFile {
  Key: string;
  Size: number;
}

interface EnvironmentVariables {
  SPACES_KEY: string;
  SPACES_SECRET: string;
  SPACES_BUCKET: string;
  SPACES_REGION: string;
}

// Validate environment variables
function validateEnv(): EnvironmentVariables {
  const requiredEnvVars = ['SPACES_KEY', 'SPACES_SECRET', 'SPACES_BUCKET', 'SPACES_REGION'];
  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

  if (missingEnvVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  }

  return {
    SPACES_KEY: process.env.SPACES_KEY!,
    SPACES_SECRET: process.env.SPACES_SECRET!,
    SPACES_BUCKET: process.env.SPACES_BUCKET!,
    SPACES_REGION: process.env.SPACES_REGION!,
  };
}

// Configuration
const env = validateEnv();
const MAX_CONCURRENT_DOWNLOADS = 5;

// Initialize S3 client
const s3 = new AWS.S3({
  endpoint: `https://${env.SPACES_REGION}.digitaloceanspaces.com`,
  accessKeyId: env.SPACES_KEY,
  secretAccessKey: env.SPACES_SECRET,
  region: env.SPACES_REGION,
  s3ForcePathStyle: false,
});

async function listObjects(): Promise<SpaceFile[]> {
  const params: AWS.S3.ListObjectsRequest = {
    Bucket: env.SPACES_BUCKET,
  };

  try {
    const data = await s3.listObjects(params).promise();
    if (!data.Contents) {
      return [];
    }

    console.log("Found", data.Contents.length, "files");
    return data.Contents
      .filter((obj): obj is AWS.S3.Object & { Size: number } => obj.Size !== undefined && obj.Size > 0)
      .map(obj => ({
        Key: obj.Key!,
        Size: obj.Size
      }));
  } catch (err) {
    console.error('Error listing bucket contents:', err);
    process.exit(1);
  }
}

async function downloadFile(file: SpaceFile): Promise<void> {
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

    const params: AWS.S3.GetObjectRequest = {
      Bucket: env.SPACES_BUCKET,
      Key: filePath,
    };

    // Create read stream from S3
    const readStream = s3.getObject(params).createReadStream();
    const writeStream = fs.createWriteStream(downloadPath);

    let downloadedBytes = 0;
    readStream.on('data', (chunk: Buffer) => {
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
    throw err; // Re-throw to handle in downloadBatch
  }
}

async function downloadBatch(files: SpaceFile[]): Promise<void> {
  const queue = [...files];
  const inProgress = new Set<Promise<void>>();
  const results: Promise<void>[] = [];

  while (queue.length > 0 || inProgress.size > 0) {
    // Fill up to max concurrent downloads
    while (queue.length > 0 && inProgress.size < MAX_CONCURRENT_DOWNLOADS) {
      const file = queue.shift()!;
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
  await Promise.allSettled(results);
}

async function main(): Promise<void> {
  try {
    const files = await listObjects();
    console.log(`Starting download of ${files.length} files...`);
    await downloadBatch(files);
    console.log('\nSuccess! All files downloaded :-)');
  } catch (err) {
    console.error('Error in main execution:', err);
    process.exit(1);
  }
}

main();
