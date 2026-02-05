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
      mediaMimeTypes,
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
      let postUrl: string | null = null;
      switch (platform) {
        case 'facebook':
          externalPostId = await this.publishToFacebook(
            decryptedToken,
            caption,
            mediaUrls,
            pageId,
          );
          if (pageId && externalPostId) {
            postUrl = `https://www.facebook.com/${pageId}/posts/${externalPostId}`;
          }
          break;
        case 'instagram':
          externalPostId = await this.publishToInstagram(decryptedToken, caption, mediaUrls);
          break;
        case 'tiktok':
          const tiktokResult = await this.publishToTikTok(
            decryptedToken,
            caption,
            mediaUrls || [],
            (mediaMimeTypes as string[]) || [],
          );
          externalPostId = tiktokResult.publishId;
          postUrl = tiktokResult.postUrl;
          break;
        case 'twitter':
          externalPostId = await this.publishToTwitter(decryptedToken, caption, mediaUrls);
          if (externalPostId) {
            postUrl = `https://x.com/i/status/${externalPostId}`;
          }
          break;
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }

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
          postUrl,
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
    mediaMimeTypes: string[],
  ): Promise<{ publishId: string; postUrl: string | null }> {
    // TikTok Direct Post: https://developers.tiktok.com/doc/content-posting-api-reference-direct-post
    const videoUrl = this.getFirstVideoUrl(mediaUrls, mediaMimeTypes);
    if (!videoUrl) {
      throw new Error(
        'TikTok requires at least one video. Add a video to your post. Images alone are not supported.',
      );
    }

    // 1. Get creator info for privacy_level
    const creatorRes = await fetch('https://open.tiktokapis.com/v2/post/publish/creator_info/query/', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({}),
    });
    if (!creatorRes.ok) {
      const err = await creatorRes.json().catch(() => ({})) as Record<string, unknown>;
      throw new Error(this.formatTikTokError(err, 'creator_info'));
    }
    const creatorData = (await creatorRes.json()) as {
      data?: { privacy_level_options?: string[] };
    };
    const privacyOptions = creatorData.data?.privacy_level_options || [];
    const privacyLevel =
      privacyOptions.includes('PUBLIC_TO_EVERYONE')
        ? 'PUBLIC_TO_EVERYONE'
        : privacyOptions[0] || 'SELF_ONLY';

    // 2. Init video post with PULL_FROM_URL
    const initBody = {
      post_info: {
        privacy_level: privacyLevel,
        title: caption || '',
        disable_duet: false,
        disable_stitch: false,
        disable_comment: false,
      },
      source_info: {
        source: 'PULL_FROM_URL',
        video_url: videoUrl,
      },
    };
    const initRes = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify(initBody),
    });
    if (!initRes.ok) {
      const err = await initRes.json().catch(() => ({})) as Record<string, unknown>;
      throw new Error(this.formatTikTokError(err, 'video/init'));
    }
    const initData = (await initRes.json()) as {
      data?: { publish_id?: string };
    };
    const publishId = initData.data?.publish_id;
    if (!publishId) {
      throw new Error('TikTok did not return publish_id.');
    }

    // Post URL: TikTok returns publish_id; actual video URL available after moderation.
    // We store publish_id. Optionally poll status/fetch for post_id later.
    const postUrl = null; // Could poll status to get video ID and build https://www.tiktok.com/video/{id}

    return { publishId, postUrl };
  }

  private formatTikTokError(err: Record<string, unknown>, context: string): string {
    const error = (err.error as Record<string, unknown>) || err;
    const code = (error?.code as string) || (err.code as string) || '';
    const message = (error?.message as string) || (err.message as string) || (err.error_description as string) || '';
    const logId = (error?.log_id as string) || (err.log_id as string) || '';

    const parts: string[] = [];
    if (code) parts.push(`[${code}]`);
    if (message) parts.push(message);
    if (logId) parts.push(`(log_id: ${logId})`);
    if (parts.length === 0) {
      parts.push(`TikTok ${context} failed. Raw: ${JSON.stringify(err)}`);
    }

    return parts.join(' ').trim();
  }

  private getFirstVideoUrl(mediaUrls: string[], mediaMimeTypes: string[]): string | null {
    const videoIndex = mediaMimeTypes.findIndex((m) => m?.startsWith('video/'));
    if (videoIndex >= 0 && mediaUrls[videoIndex]) {
      return mediaUrls[videoIndex];
    }
    return mediaUrls[0] || null;
  }

  private async publishToTwitter(
    accessToken: string,
    caption: string,
    mediaUrls: string[],
  ): Promise<string> {
    // Placeholder - X (Twitter) API v2 Create Post
    // Docs: https://developer.x.com/en/docs/twitter-api/tweets/manage-tweets/api-reference/post-tweets
    return `twitter_post_${Date.now()}`;
  }
}
