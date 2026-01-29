import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import { IStorageProvider } from './storage-provider.interface';

@Injectable()
export class CloudinaryStorageService implements IStorageProvider {
  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async upload(
    buffer: Buffer,
    mimeType: string,
    originalName?: string,
  ): Promise<{ url: string }> {
    return new Promise((resolve, reject) => {
      const folder = this.configService.get<string>('CLOUDINARY_UPLOAD_FOLDER') || 'social-commerce';
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: mimeType.startsWith('video/') ? 'video' : 'image',
        },
        (err, result) => {
          if (err) return reject(err);
          if (!result?.secure_url) return reject(new Error('No URL returned from Cloudinary'));
          resolve({ url: result.secure_url });
        },
      );
      Readable.from(buffer).pipe(stream);
    });
  }
}
