import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../../../api/src/prisma/prisma.service';
import { IntegrationsService } from '../../../api/src/integrations/integrations.service';
import { RATE_LIMITS } from '@social-commerce/shared';
import Redis from 'ioredis';

@Processor('publishing')
export class PublishingProcessor extends WorkerHost {
  private redis: Redis;

  constructor(
    private prisma: PrismaService,
    private integrationsService: IntegrationsService,
  ) {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'redis',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });
  }

  async process(job: Job) {
    return this.processPublish(job);
  }

  async processPublish(job: Job) {
    const {
      postId,
      destinationId,
      platform,
      caption,
      mediaUrls,
      accessToken,
      integrationId,
      pageId,
    } = job.data;

    try {
      // Rate limiting check
      await this.checkRateLimit(platform);

      // Decrypt access token if it looks encrypted (contains ':')
      const decryptedToken =
        typeof accessToken === 'string' && accessToken.includes(':')
          ? this.integrationsService.decryptToken(accessToken)
          : accessToken;

      // Publish to platform
      let externalPostId: string;
      switch (platform) {
        case 'facebook':
          externalPostId = await this.publishToFacebook(
            decryptedToken,
            caption,
            mediaUrls,
            pageId,
          );
          break;
        case 'instagram':
          externalPostId = await this.publishToInstagram(decryptedToken, caption, mediaUrls);
          break;
        case 'tiktok':
          externalPostId = await this.publishToTikTok(decryptedToken, caption, mediaUrls);
          break;
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }

      // Update destination status to published
      await this.prisma.postDestination.update({
        where: {
          postId_destinationId: {
            postId,
            destinationId,
          },
        },
        data: {
          status: 'published',
          externalPostId,
          publishedAt: new Date(),
          error: null,
        },
      });

      // Update post status if all destinations are published
      await this.checkAndUpdatePostStatus(postId);

      return { success: true, externalPostId };
    } catch (error: any) {
      // Update destination status to failed
      await this.prisma.postDestination.update({
        where: {
          postId_destinationId: {
            postId,
            destinationId,
          },
        },
        data: {
          status: 'failed',
          error: error.message || 'Unknown error',
        },
      });

      throw error; // Re-throw for BullMQ retry logic
    }
  }

  private async checkRateLimit(platform: string) {
    const key = `rate_limit:${platform}`;
    const limit = RATE_LIMITS[platform as keyof typeof RATE_LIMITS] || 100;
    const window = 60; // 1 minute

    const current = await this.redis.incr(key);
    if (current === 1) {
      await this.redis.expire(key, window);
    }

    if (current > limit) {
      throw new Error(`Rate limit exceeded for ${platform}. Please try again later.`);
    }
  }

  private async checkAndUpdatePostStatus(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        destinations: true,
        client: true,
      },
    });

    if (!post) return;

    const allPublished = post.destinations.every((dest) => dest.status === 'published');
    const anyFailed = post.destinations.some((dest) => dest.status === 'failed');
    const anyPublishing = post.destinations.some((dest) => dest.status === 'publishing');

    if (allPublished) {
      await this.prisma.post.update({
        where: { id: postId },
        data: { status: 'published' },
      });

      // Emit billing usage event: post published (placeholder pricing for now)
      // Pricing will be driven by tariff rules in billing module later.
      try {
        await this.prisma.usageEvent.create({
          data: {
            tenantId: post.tenantId,
            clientId: post.clientId,
            type: 'post_published',
            occurredAt: new Date(),
            quantity: 1,
            unitPrice: 0,
            amount: 0,
            metadataJson: {
              postId,
              destinations: post.destinations.length,
            },
          },
        });
      } catch {
        // Don't fail publishing if billing write fails
      }
    } else if (anyFailed && !anyPublishing) {
      await this.prisma.post.update({
        where: { id: postId },
        data: { status: 'failed' },
      });
    }
  }

  // Platform-specific publishing methods
  private async publishToFacebook(
    accessToken: string,
    caption: string,
    mediaUrls: string[],
    pageId?: string,
  ): Promise<string> {
    const page = pageId || 'me';
    const baseUrl = `https://graph.facebook.com/v18.0/${page}`;

    if (mediaUrls.length > 0) {
      // Post photo with caption
      const photoUrl = mediaUrls[0];
      const params = new URLSearchParams({
        access_token: accessToken,
        url: photoUrl,
        caption: caption || '',
      });
      const res = await fetch(`${baseUrl}/photos?${params.toString()}`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Facebook photo post failed: ${err}`);
      }
      const data = (await res.json()) as { id: string };
      return data.id;
    }

    // Text-only post to page feed
    const params = new URLSearchParams({
      access_token: accessToken,
      message: caption || '',
    });
    const res = await fetch(`${baseUrl}/feed?${params.toString()}`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Facebook feed post failed: ${err}`);
    }
    const data = (await res.json()) as { id: string };
    return data.id;
  }

  private async publishToInstagram(
    accessToken: string,
    caption: string,
    mediaUrls: string[],
  ): Promise<string> {
    // Mock implementation - would use Instagram Graph API
    return `ig_post_${Date.now()}`;
  }

  private async publishToTikTok(
    accessToken: string,
    caption: string,
    mediaUrls: string[],
  ): Promise<string> {
    // Placeholder - TikTok Content Posting API
    // Docs: https://developers.tiktok.com/doc/content-posting-api-get-started
    // Requires: video.publish or video.upload scope, user access token
    return `tiktok_post_${Date.now()}`;
  }
}
