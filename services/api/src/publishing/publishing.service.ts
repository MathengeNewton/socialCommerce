import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { LinkGenerationService } from '../link-generation/link-generation.service';
import { AuditService } from '../audit/audit.service';
import { IntegrationsService } from '../integrations/integrations.service';
import { MediaService } from '../media/media.service';

@Injectable()
export class PublishingService {
  constructor(
    @InjectQueue('publishing') private publishingQueue: Queue,
    private prisma: PrismaService,
    private linkGenerationService: LinkGenerationService,
    private auditService: AuditService,
    private integrationsService: IntegrationsService,
    private mediaService: MediaService,
  ) {}

  async publishPost(tenantId: string, postId: string, userId?: string) {
    const post = await this.prisma.post.findFirst({
      where: {
        id: postId,
        tenantId,
      },
      include: {
        destinations: {
          include: {
            destination: {
              include: {
                integration: true,
              },
            },
          },
        },
        products: {
          include: {
            product: true,
          },
        },
        captions: true,
        media: {
          include: {
            media: true,
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException(`Post with id "${postId}" not found`);
    }

    if (post.status !== 'draft' && post.status !== 'scheduled') {
      throw new BadRequestException(`Cannot publish post with status "${post.status}"`);
    }

    // Update post status
    await this.prisma.post.update({
      where: { id: postId },
      data: { status: 'publishing' },
    });

    // Get primary product slug for link generation
    const primaryProduct = post.products.find((pp) => pp.isPrimary)?.product;
    const productSlug = primaryProduct?.slug || null;

    const destTypeToPlatform: Record<string, string> = {
      facebook_page: 'facebook',
      instagram_business: 'instagram',
      tiktok_account: 'tiktok',
      twitter_account: 'twitter',
    };

    for (const postDest of post.destinations) {
      const platform =
        destTypeToPlatform[postDest.destination.type] ||
        postDest.destination.integration.provider;
      const caption = post.captions.find((c) => c.platform === platform);

      if (!caption) {
        continue;
      }

      let finalCaption = caption.caption;
      if (caption.hashtags?.trim()) {
        finalCaption = `${finalCaption}\n\n${caption.hashtags.trim()}`;
      }
      if (caption.includeLink && productSlug) {
        const link = this.linkGenerationService.generateProductLink(productSlug, platform);
        finalCaption = this.linkGenerationService.appendLinkToCaption(
          finalCaption,
          link,
          platform,
          true,
        );
      }

      let accessToken = postDest.destination.integration.accessToken;
      const destMeta = postDest.destination.metadata as { pageAccessTokenEncrypted?: string } | null;
      if (platform === 'facebook' && destMeta?.pageAccessTokenEncrypted) {
        accessToken = this.integrationsService.decryptToken(destMeta.pageAccessTokenEncrypted);
      }

      let mediaItems: { url: string; mimeType: string }[];
      const overrideIds = postDest.mediaIds as string[] | null;
      const mediaList =
        Array.isArray(overrideIds) && overrideIds.length > 0
          ? overrideIds
              .map((id) => post.media.find((pm) => pm.mediaId === id)?.media)
              .filter((m): m is NonNullable<typeof m> => !!m)
          : post.media.map((pm) => pm.media);
      if (mediaList.length === 0) {
        mediaItems = [];
      } else {
        mediaItems = await Promise.all(
          mediaList.map(async (m) => ({
            url: await this.mediaService.resolveMediaUrl(m.url),
            mimeType: m.mimeType,
          })),
        );
      }
      const mediaUrls = mediaItems.map((m) => m.url);

      const jobPayload: Record<string, unknown> = {
        postId,
        destinationId: postDest.destinationId,
        platform,
        caption: finalCaption,
        mediaUrls,
        mediaMimeTypes: mediaItems.map((m) => m.mimeType),
        accessToken,
        integrationId: postDest.destination.integration.id,
      };
      if (platform === 'facebook') {
        jobPayload.pageId = postDest.destination.externalId;
      }

      // Create job with idempotency key
      const jobId = `${postId}-${postDest.destinationId}`;

      await this.publishingQueue.add(
        'publish',
        jobPayload,
        {
          jobId, // Idempotency key
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      );
    }

    await this.auditService.log(
      tenantId,
      userId ?? null,
      'post.publish',
      'post',
      postId,
      { destinationCount: post.destinations.length },
    );

    return post;
  }
}
