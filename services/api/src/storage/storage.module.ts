import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { S3Module } from '../s3/s3.module';
import { CloudinaryStorageService } from './cloudinary.storage';
import { S3StorageService } from './s3.storage';
import { IStorageProvider, STORAGE_PROVIDER } from './storage-provider.interface';

@Module({
  imports: [ConfigModule, S3Module],
  providers: [
    CloudinaryStorageService,
    S3StorageService,
    {
      provide: STORAGE_PROVIDER,
      useFactory: (
        cloudinary: CloudinaryStorageService,
        s3: S3StorageService,
        config: ConfigService,
      ): IStorageProvider => {
        const driver = config.get<string>('MEDIA_STORAGE') || 'cloudinary';
        return driver === 's3' ? s3 : cloudinary;
      },
      inject: [CloudinaryStorageService, S3StorageService, ConfigService],
    },
  ],
  exports: [STORAGE_PROVIDER],
})
export class StorageModule {}
