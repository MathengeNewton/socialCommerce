import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

@Injectable()
export class S3Service {
  private s3Client: S3Client;
  private bucket: string;
  private endpoint: string;

  constructor(private configService: ConfigService) {
    this.endpoint = this.configService.get<string>('S3_ENDPOINT') || 'http://localhost:9000';
    this.bucket = this.configService.get<string>('S3_BUCKET') || 'media';

    this.s3Client = new S3Client({
      endpoint: this.endpoint,
      region: this.configService.get<string>('S3_REGION') || 'us-east-1',
      credentials: {
        accessKeyId: this.configService.get<string>('S3_ACCESS_KEY') || 'minioadmin',
        secretAccessKey: this.configService.get<string>('S3_SECRET_KEY') || 'minioadmin',
      },
      forcePathStyle: true, // Required for MinIO
    });
  }

  async getSignedUploadUrl(mimeType: string): Promise<{ uploadUrl: string; key: string }> {
    const extension = this.getExtensionFromMimeType(mimeType);
    const key = `media/${randomUUID()}${extension}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: mimeType,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 }); // 1 hour

    return {
      uploadUrl,
      key,
    };
  }

  async getSignedUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn: 3600 * 24 }); // 24 hours
  }

  /** Upload buffer directly (for Spaces / S3 when used as primary storage). Returns key to store in Media.url. */
  async uploadBuffer(buffer: Buffer, mimeType: string, originalName?: string): Promise<{ key: string }> {
    const ext = this.getExtensionFromMimeType(mimeType);
    const key = `media/${randomUUID()}${ext}`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      }),
    );

    return { key };
  }

  /** True if the stored url is an S3 key (not a full URL like Cloudinary). */
  isS3Key(url: string): boolean {
    return !url.startsWith('http://') && !url.startsWith('https://');
  }

  private getExtensionFromMimeType(mimeType: string): string {
    const extensions: Record<string, string> = {
      'image/png': '.png',
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'video/mp4': '.mp4',
    };

    return extensions[mimeType] || '';
  }
}
