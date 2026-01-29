import { Injectable } from '@nestjs/common';
import { S3Service } from '../s3/s3.service';
import { IStorageProvider } from './storage-provider.interface';

/**
 * S3/Spaces storage provider. Stores object key in Media.url;
 * getMedia will use S3Service.getSignedUrl(key) for access.
 */
@Injectable()
export class S3StorageService implements IStorageProvider {
  constructor(private s3Service: S3Service) {}

  async upload(
    buffer: Buffer,
    mimeType: string,
    originalName?: string,
  ): Promise<{ url: string }> {
    const { key } = await this.s3Service.uploadBuffer(buffer, mimeType, originalName);
    return { url: key };
  }
}
