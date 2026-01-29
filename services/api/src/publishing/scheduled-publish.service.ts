import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { PublishingService } from './publishing.service';

@Injectable()
export class ScheduledPublishService {
  constructor(
    private prisma: PrismaService,
    private publishingService: PublishingService,
  ) {}

  @Cron('* * * * *') // Every minute
  async processScheduledPosts() {
    const now = new Date();
    const due = await this.prisma.post.findMany({
      where: {
        status: 'scheduled',
        scheduledAt: { lte: now },
      },
      select: { id: true, tenantId: true },
    });

    for (const post of due) {
      try {
        await this.publishingService.publishPost(post.tenantId, post.id);
      } catch (err) {
        console.error(`Scheduled publish failed for post ${post.id}:`, err);
      }
    }
  }
}
