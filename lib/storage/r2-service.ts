// lib/storage/r2-service.ts
// Cloudflare R2 storage service for image storage
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_CDN_URL = process.env.R2_CDN_URL;

if (!R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
  console.warn('⚠️ R2 configuration incomplete. Some features may not work.');
}

const R2 = R2_ENDPOINT && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY
  ? new S3Client({
      region: 'auto',
      endpoint: R2_ENDPOINT,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    })
  : null;

export class R2StorageService {
  private bucket: string;
  private cdnUrl: string | null;

  constructor() {
    this.bucket = R2_BUCKET_NAME || 'labubufy-images';
    this.cdnUrl = R2_CDN_URL || null;
  }

  async uploadImage(
    userId: string,
    imageBlob: Blob,
    metadata: Record<string, string> = {}
  ): Promise<string> {
    if (!R2) {
      throw new Error('R2 storage is not configured');
    }

    const key = `users/${userId}/images/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

    const arrayBuffer = await imageBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await R2.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: 'image/jpeg',
      Metadata: metadata,
    }));

    // Return CDN URL if available, otherwise construct URL
    if (this.cdnUrl) {
      return `${this.cdnUrl}/${key}`;
    }

    // Fallback: return key (will need to be accessed via signed URL)
    return key;
  }

  async getPresignedUploadUrl(userId: string, expiresIn: number = 3600): Promise<string> {
    if (!R2) {
      throw new Error('R2 storage is not configured');
    }

    const key = `users/${userId}/uploads/${Date.now()}.jpg`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: 'image/jpeg',
    });

    return getSignedUrl(R2, command, { expiresIn });
  }

  async getPresignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    if (!R2) {
      throw new Error('R2 storage is not configured');
    }

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(R2, command, { expiresIn });
  }

  async deleteImage(key: string): Promise<void> {
    if (!R2) {
      throw new Error('R2 storage is not configured');
    }

    await R2.send(new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    }));
  }

  /**
   * Get public URL for an image (uses CDN if available)
   */
  getPublicUrl(key: string): string {
    if (this.cdnUrl) {
      return `${this.cdnUrl}/${key}`;
    }
    // If no CDN, would need to use presigned URLs
    // For now, return the key
    return key;
  }

  /**
   * Check if R2 is configured
   */
  isConfigured(): boolean {
    return R2 !== null;
  }
}

export const r2Storage = new R2StorageService();

