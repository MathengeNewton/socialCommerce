import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { PublishingProcessor } from './processors/publishing.processor';
import { PrismaService } from '../../api/src/prisma/prisma.service';
import { IntegrationsService } from '../../api/src/integrations/integrations.service';
import { PrismaClient } from '@prisma/client';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    BullModule.registerQueue({
      name: 'publishing',
    }),
  ],
  providers: [
    PublishingProcessor,
    {
      provide: PrismaService,
      useFactory: () => {
        const prisma = new PrismaClient();
        return prisma;
      },
    },
    {
      provide: IntegrationsService,
      useFactory: (prisma: PrismaService) => {
        const configService = {
          get: (key: string) => process.env[key] || 'default-key-change-me',
        };
        return new IntegrationsService(prisma as any, configService as any);
      },
      inject: [PrismaService],
    },
  ],
})
export class WorkerModule {}
