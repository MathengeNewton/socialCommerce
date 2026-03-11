import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StorefrontSettingsController } from './storefront-settings.controller';
import { StorefrontSettingsService } from './storefront-settings.service';

@Module({
  imports: [PrismaModule],
  controllers: [StorefrontSettingsController],
  providers: [StorefrontSettingsService],
  exports: [StorefrontSettingsService],
})
export class StorefrontSettingsModule {}
