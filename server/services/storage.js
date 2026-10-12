import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';

class StorageService {
  constructor() {
    let rawAccountId = process.env.R2_ACCOUNT_ID || '';
    if (rawAccountId.includes('.r2.cloudflarestorage.com')) {
      rawAccountId = rawAccountId.replace(/^https?:\/\//, '').replace(/\.r2\.cloudflarestorage\.com.*$/, '');
    }
    this.accountId = rawAccountId;
    this.accessKeyId = process.env.R2_ACCESS_KEY_ID;
    this.secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    this.bucketName = process.env.R2_BUCKET_NAME;
    this.publicDomain = process.env.R2_PUBLIC_DOMAIN; // e.g. https://cdn.subtie.com

    if (this.isConfigured()) {
      this.s3Client = new S3Client({
        region: 'auto',
        endpoint: `https://${this.accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: this.accessKeyId,
          secretAccessKey: this.secretAccessKey,
        },
      });
      console.log('☁️ StorageService initialized with Cloudflare R2.');
    } else {
      console.log('📁 StorageService running in Local Fallback mode (R2 credentials not set).');
    }
  }

  isConfigured() {
    return Boolean(this.accountId && this.accessKeyId && this.secretAccessKey && this.bucketName);
  }

  /**
   * Generates a pre-signed PUT URL for direct frontend-to-R2 upload
   */
  async getPresignedUploadUrl(key, contentType = 'video/mp4', expiresIn = 3600) {
    if (!this.isConfigured()) {
      throw new Error('Cloudflare R2 is not configured. Use local file upload.');
    }

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn });
    return {
      uploadUrl,
      key,
      publicUrl: this.getPublicUrl(key),
    };
  }

  /**
   * Uploads a local file to R2
   */
  async uploadFile(localFilePath, destinationKey, contentType = 'audio/mp3') {
    if (!this.isConfigured()) {
      return { key: destinationKey, localPath: localFilePath, mode: 'local' };
    }

    const fileStream = fs.createReadStream(localFilePath);
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: destinationKey,
      Body: fileStream,
      ContentType: contentType,
    });

    await this.s3Client.send(command);
    return {
      key: destinationKey,
      publicUrl: this.getPublicUrl(destinationKey),
      mode: 'r2',
    };
  }

  /**
   * Downloads an R2 object to local temporary disk for FFmpeg processing
   */
  async downloadFile(key, localDestinationPath) {
    if (!this.isConfigured()) {
      // Local mode: copy if needed
      return localDestinationPath;
    }

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    const response = await this.s3Client.send(command);
    const dir = path.dirname(localDestinationPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    await pipeline(response.Body, fs.createWriteStream(localDestinationPath));
    return localDestinationPath;
  }

  /**
   * Returns streaming URL for the video player
   */
  getPublicUrl(key) {
    if (this.publicDomain) {
      const cleanDomain = this.publicDomain.replace(/\/+$/, '');
      return `${cleanDomain}/${key}`;
    }
    return `/uploads/${path.basename(key)}`;
  }
}

export const storage = new StorageService();
export default storage;
