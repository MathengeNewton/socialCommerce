import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import * as multer from 'multer';
import { MediaController } from './media.controller';
import { MediaStreamController } from './media-stream.controller';
import { MediaService } from './media.service';
import { PrismaModule } from '../prisma/prisma.module';
import { S3Module } from '../s3/s3.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    MulterModule.register({ storage: multer.memoryStorage() }),
    PrismaModule,
    S3Module,
    StorageModule,
  ],
  controllers: [MediaController, MediaStreamController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
