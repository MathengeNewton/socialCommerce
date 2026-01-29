import { Module } from '@nestjs/common';
import { LinkGenerationService } from './link-generation.service';

@Module({
  providers: [LinkGenerationService],
  exports: [LinkGenerationService],
})
export class LinkGenerationModule {}
