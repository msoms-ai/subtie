import 'dotenv/config';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';

class StorageService {
  constructor() {
    this.s3Client = null;
  }

  getCredentials() {
    // 1. Scan process.env case-insensitively with alias support
    const envUpper = {};
    for (const [k, v] of Object.entries(process.env)) {
      if (v && typeof v === 'string' && v.trim()) {
        envUpper[k.toUpperCase().trim()] = v.trim();
      }
    }

    let accountId = envUpper['R2_ACCOUNT_ID'] || envUpper['CLOUDFLARE_R2_ACCOUNT_ID'] || envUpper['CF_R2_ACCOUNT_ID'] || envUpper['CF_ACCOUNT_ID'] || envUpper['R2_ACCOUNT'] || '';
    let accessKeyId = envUpper['R2_ACCESS_KEY_ID'] || envUpper['R2_ACCESS_KEY'] || envUpper['AWS_ACCESS_KEY_ID'] || envUpper['CLOUDFLARE_ACCESS_KEY_ID'] || '';
    let secretAccessKey = envUpper['R2_SECRET_ACCESS_KEY'] || envUpper['R2_SECRET_KEY'] || envUpper['AWS_SECRET_ACCESS_KEY'] || envUpper['CLOUDFLARE_SECRET_ACCESS_KEY'] || '';
    let bucketName = envUpper['R2_BUCKET_NAME'] || envUpper['R2_BUCKET'] || envUpper['BUCKET_NAME'] || '';
    let publicDomain = envUpper['R2_PUBLIC_DOMAIN'] || envUpper['R2_DOMAIN'] || envUpper['R2_PUBLIC_URL'] || envUpper['PUBLIC_DOMAIN'] || '';

    // 2. Check server/data/settings.json fallback
    try {
      const settingsPath = path.resolve('server', 'data', 'settings.json');
      if (fs.existsSync(settingsPath)) {
        const s = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        if (!accountId && s.r2AccountId) accountId = s.r2AccountId.trim();
        if (!accessKeyId && s.r2AccessKeyId) accessKeyId = s.r2AccessKeyId.trim();
        if (!secretAccessKey && s.r2SecretAccessKey) secretAccessKey = s.r2SecretAccessKey.trim();
        if (!bucketName && s.r2BucketName) bucketName = s.r2BucketName.trim();
        if (!publicDomain && s.r2PublicDomain) publicDomain = s.r2PublicDomain.trim();
      }
    } catch (e) {}

    // 2. Fallback: Parse .env files directly if missing
    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
      const candidatePaths = [
        path.resolve('.env'),
        path.resolve('server', '.env'),
        path.resolve('..', '.env'),
        '/var/www/vhosts/msoms.ai/subtie.msoms.ai/.env',
        '/var/www/vhosts/msoms.ai/subtie.msoms.ai/server/.env'
      ];

      for (const p of candidatePaths) {
        try {
          if (fs.existsSync(p)) {
            const lines = fs.readFileSync(p, 'utf8').split('\n');
            lines.forEach(l => {
              const m = l.match(/^\s*([\w]+)\s*=\s*['"]?(.*?)['"]?\s*$/);
              if (m) {
                const [, k, val] = m;
                if (k === 'R2_ACCOUNT_ID' && !accountId) accountId = val.trim();
                if (k === 'R2_ACCESS_KEY_ID' && !accessKeyId) accessKeyId = val.trim();
                if (k === 'R2_SECRET_ACCESS_KEY' && !secretAccessKey) secretAccessKey = val.trim();
                if (k === 'R2_BUCKET_NAME' && !bucketName) bucketName = val.trim();
                if (k === 'R2_PUBLIC_DOMAIN' && !publicDomain) publicDomain = val.trim();
              }
            });
          }
        } catch (e) {}
      }
    }

    if (accountId.includes('.r2.cloudflarestorage.com')) {
      accountId = accountId.replace(/^https?:\/\//, '').replace(/\.r2\.cloudflarestorage\.com.*$/, '');
    }

    return { accountId, accessKeyId, secretAccessKey, bucketName, publicDomain };
  }

  isConfigured() {
    const creds = this.getCredentials();
    return Boolean(creds.accountId && creds.accessKeyId && creds.secretAccessKey && creds.bucketName);
  }

  getClient() {
    const creds = this.getCredentials();
    if (!this.isConfigured()) {
      throw new Error(`Cloudflare R2 not fully configured. Missing: ${[
        !creds.accountId && 'R2_ACCOUNT_ID',
        !creds.accessKeyId && 'R2_ACCESS_KEY_ID',
        !creds.secretAccessKey && 'R2_SECRET_ACCESS_KEY',
        !creds.bucketName && 'R2_BUCKET_NAME'
      ].filter(Boolean).join(', ')}`);
    }

    if (!this.s3Client) {
      this.s3Client = new S3Client({
        region: 'auto',
        endpoint: `https://${creds.accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: creds.accessKeyId,
          secretAccessKey: creds.secretAccessKey,
        },
      });
      console.log(`☁️ [Cloudflare R2] S3Client initialized for bucket: ${creds.bucketName}`);
    }
    return this.s3Client;
  }

  /**
   * Generates a pre-signed PUT URL for direct frontend-to-R2 upload
   */
  async getPresignedUploadUrl(key, contentType = 'video/mp4', expiresIn = 3600) {
    const creds = this.getCredentials();
    const client = this.getClient();

    const command = new PutObjectCommand({
      Bucket: creds.bucketName,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn });
    return {
      uploadUrl,
      key,
      publicUrl: this.getPublicUrl(key),
    };
  }

  /**
   * Uploads a local file to R2
   */
  async uploadFile(localFilePath, destinationKey, contentType = 'video/mp4') {
    if (!this.isConfigured()) {
      console.warn('⚠️ [StorageService] uploadFile called but R2 is not configured. Retaining local file.');
      return { key: destinationKey, localPath: localFilePath, mode: 'local' };
    }

    const creds = this.getCredentials();
    const client = this.getClient();
    const fileStream = fs.createReadStream(localFilePath);

    const command = new PutObjectCommand({
      Bucket: creds.bucketName,
      Key: destinationKey,
      Body: fileStream,
      ContentType: contentType,
    });

    console.log(`☁️ [Cloudflare R2] Uploading ${localFilePath} to bucket: ${creds.bucketName} (${destinationKey})...`);
    await client.send(command);
    console.log(`✅ [Cloudflare R2] Successfully uploaded ${destinationKey}!`);

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
      return localDestinationPath;
    }

    const creds = this.getCredentials();
    const client = this.getClient();

    const command = new GetObjectCommand({
      Bucket: creds.bucketName,
      Key: key,
    });

    const response = await client.send(command);
    const dir = path.dirname(localDestinationPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    await pipeline(response.Body, fs.createWriteStream(localDestinationPath));
    return localDestinationPath;
  }

  /**
   * Returns streaming URL for the video player
   */
  getPublicUrl(key) {
    const creds = this.getCredentials();
    if (creds.publicDomain) {
      const cleanDomain = creds.publicDomain.replace(/\/+$/, '');
      return `${cleanDomain}/${key}`;
    }
    return `https://${creds.accountId}.r2.cloudflarestorage.com/${creds.bucketName}/${key}`;
  }

  getStatus() {
    const creds = this.getCredentials();
    const missing = [
      !creds.accountId && 'R2_ACCOUNT_ID',
      !creds.accessKeyId && 'R2_ACCESS_KEY_ID',
      !creds.secretAccessKey && 'R2_SECRET_ACCESS_KEY',
      !creds.bucketName && 'R2_BUCKET_NAME'
    ].filter(Boolean);

    return {
      configured: this.isConfigured(),
      bucketName: creds.bucketName || 'Not set',
      accountId: creds.accountId ? `${creds.accountId.slice(0, 4)}...${creds.accountId.slice(-4)}` : 'Not set',
      publicDomain: creds.publicDomain || 'Not set',
      missingKeys: missing,
      mode: this.isConfigured() ? 'Cloudflare R2' : 'Local Disk Fallback',
    };
  }
}

export const storage = new StorageService();
export default storage;
