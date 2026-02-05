import { Inject, Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { STORAGE_PROVIDER } from '../storage/storage-provider.interface';
import { IStorageProvider } from '../storage/storage-provider.interface';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '@social-commerce/shared';

@Injectable()
export class MediaService {
  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service,
    private configService: ConfigService,
    @Inject(STORAGE_PROVIDER) private storage: IStorageProvider,
  ) {}

  async createUpload(
    tenantId: string,
    clientId: string | null,
    mimeType: string,
    size: number,
  ) {
    // Validate mime type
    if (!ALLOWED_MIME_TYPES.includes(mimeType as any)) {
      throw new BadRequestException(
        `Invalid mime type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    // Validate file size
    if (size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }

    // Generate signed upload URL
    const { uploadUrl, key } = await this.s3Service.getSignedUploadUrl(mimeType);

    // Create media record
    const media = await this.prisma.media.create({
      data: {
        tenantId,
        clientId,
        url: key, // Store S3 key, will be converted to full URL when needed
        mimeType,
        size,
      },
    });

    return {
      mediaId: media.id,
      uploadUrl,
    };
  }

  async confirmUpload(
    mediaId: string,
    metadata: { width?: number | null; height?: number | null; duration?: number | null },
  ) {
    const media = await this.prisma.media.findUnique({
      where: { id: mediaId },
    });

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    const updated = await this.prisma.media.update({
      where: { id: mediaId },
      data: {
        width: metadata.width ?? null,
        height: metadata.height ?? null,
        duration: metadata.duration ?? null,
      },
    });

    return updated;
  }

  /**
   * Direct upload: client sends file, we upload to storage (Cloudinary or S3) and create Media.
   * Returns mediaId and displayUrl for preview. Swap storage via MEDIA_STORAGE=cloudinary|s3.
   */
  async uploadFile(
    tenantId: string,
    clientId: string | null,
    buffer: Buffer,
    mimeType: string,
    size: number,
    originalName?: string,
  ): Promise<{ mediaId: string; url: string }> {
    if (!ALLOWED_MIME_TYPES.includes(mimeType as any)) {
      throw new BadRequestException(
        `Invalid mime type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }
    if (size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }

    const { url: storedUrl } = await this.storage.upload(buffer, mimeType, originalName);

    const media = await this.prisma.media.create({
      data: {
        tenantId,
        clientId,
        url: storedUrl,
        mimeType,
        size,
      },
    });

    const displayUrl = this.s3Service.isS3Key(storedUrl)
      ? await this.s3Service.getSignedUrl(storedUrl)
      : storedUrl;

    return { mediaId: media.id, url: displayUrl };
  }

  /** Resolve media URL for display: Cloudinary URLs pass through, S3 keys get signed URLs. */
  async resolveMediaUrl(storedUrl: string): Promise<string> {
    if (this.s3Service.isS3Key(storedUrl)) {
      return this.s3Service.getSignedUrl(storedUrl);
    }
    return storedUrl;
  }

  /**
   * Generate a URL for TikTok PULL_FROM_URL that proxies through our API domain.
   * TikTok requires the video URL domain to be verified - this lets you verify api.yourdomain.com.
   */
  getTikTokProxyUrl(mediaId: string): string {
    const baseUrl = this.configService.get<string>('API_PUBLIC_URL') || 'http://localhost:3004';
    const expires = Date.now() + 24 * 60 * 60 * 1000; // 24h
    const token = this.getStreamToken(mediaId, expires);
    return `${baseUrl.replace(/\/$/, '')}/media/public/${mediaId}/stream?token=${token}&expires=${expires}`;
  }

  private getEncryptionKey(): Buffer {
    const keyRaw = this.configService.get<string>('ENCRYPTION_KEY') || 'default-key-change-me';
    return crypto.createHash('sha256').update(keyRaw, 'utf8').digest();
  }

  getStreamToken(mediaId: string, expires: number): string {
    const key = this.getEncryptionKey();
    const hmac = crypto.createHmac('sha256', key);
    hmac.update(`${mediaId}:${expires}`);
    return hmac.digest('hex');
  }

  async streamMedia(mediaId: string, res: { setHeader: (k: string, v: string) => void; send: (b: Buffer) => void }): Promise<void> {
    const media = await this.prisma.media.findUnique({ where: { id: mediaId } });
    if (!media) {
      throw new NotFoundException('Media not found');
    }
    const url = await this.resolveMediaUrl(media.url);
    const fetchRes = await fetch(url);
    if (!fetchRes.ok) {
      throw new NotFoundException('Media not accessible');
    }
    const contentType = fetchRes.headers.get('content-type') || media.mimeType || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    const buffer = Buffer.from(await fetchRes.arrayBuffer());
    res.send(buffer);
  }

  async getMedia(mediaId: string, tenantId: string) {
    const media = await this.prisma.media.findFirst({
      where: {
        id: mediaId,
        tenantId,
      },
    });

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    const url = this.s3Service.isS3Key(media.url)
      ? await this.s3Service.getSignedUrl(media.url)
      : media.url;

    return {
      ...media,
      url,
    };
  }
}
