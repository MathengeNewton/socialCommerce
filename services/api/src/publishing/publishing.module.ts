import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PublishingService } from './publishing.service';
import { ScheduledPublishService } from './scheduled-publish.service';
import { PrismaModule } from '../prisma/prisma.module';
import { LinkGenerationModule } from '../link-generation/link-generation.module';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'publishing',
    }),
    PrismaModule,
    LinkGenerationModule,
    IntegrationsModule,
  ],
  providers: [PublishingService, ScheduledPublishService],
  exports: [PublishingService],
})
export class PublishingModule {}
