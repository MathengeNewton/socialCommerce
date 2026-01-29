import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { LinkGenerationService } from '../link-generation/link-generation.service';
import { AuditService } from '../audit/audit.service';
import { IntegrationsService } from '../integrations/integrations.service';

@Injectable()
export class PublishingService {
  constructor(
    @InjectQueue('publishing') private publishingQueue: Queue,
    private prisma: PrismaService,
    private linkGenerationService: LinkGenerationService,
    private auditService: AuditService,
    private integrationsService: IntegrationsService,
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

    // Create job for each destination
    for (const postDest of post.destinations) {
      const platform = postDest.destination.integration.provider;
      const caption = post.captions.find((c) => c.platform === platform);

      if (!caption) {
        continue; // Skip if no caption for this platform
      }

      // Format caption with link if enabled
      let finalCaption = caption.caption;
      if (caption.includeLink && productSlug) {
        const link = this.linkGenerationService.generateProductLink(productSlug, platform);
        finalCaption = this.linkGenerationService.appendLinkToCaption(
          caption.caption,
          link,
          platform,
          true,
        );
      }

      // For Facebook use Page token from destination metadata if present
      let accessToken = postDest.destination.integration.accessToken;
      const destMeta = postDest.destination.metadata as { pageAccessTokenEncrypted?: string } | null;
      if (platform === 'facebook' && destMeta?.pageAccessTokenEncrypted) {
        accessToken = this.integrationsService.decryptToken(destMeta.pageAccessTokenEncrypted);
      }

      const jobPayload: Record<string, unknown> = {
        postId,
        destinationId: postDest.destinationId,
        platform,
        caption: finalCaption,
        mediaUrls: post.media.map((pm) => pm.media.url),
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
