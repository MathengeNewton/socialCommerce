import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MediaService } from '../media/media.service';
import { LinkGenerationService } from '../link-generation/link-generation.service';
import { PublishingService } from '../publishing/publishing.service';
import { AuditService } from '../audit/audit.service';
import { createPostSchema, updatePostSchema } from '@social-commerce/shared';

@Injectable()
export class PostsService {
  constructor(
    private prisma: PrismaService,
    private mediaService: MediaService,
    private linkGenerationService: LinkGenerationService,
    private publishingService: PublishingService,
    private auditService: AuditService,
  ) {}

  async create(tenantId: string, clientId: string, createDto: any) {
    const validated = createPostSchema.parse(createDto);

    // Verify client exists and belongs to tenant
    const client = await this.prisma.client.findFirst({
      where: {
        id: clientId,
        tenantId,
      },
    });

    if (!client) {
      throw new BadRequestException(`Client with id "${clientId}" not found`);
    }

    // Validate destinations belong to the client
    if (validated.destinationIds && validated.destinationIds.length > 0) {
      const destinations = await this.prisma.destination.findMany({
        where: {
          id: { in: validated.destinationIds },
          integration: {
            tenantId,
            clientId,
          },
        },
      });

      if (destinations.length !== validated.destinationIds.length) {
        throw new BadRequestException('One or more destinations do not belong to the selected client');
      }
    }

    // Validate products belong to the tenant (products are tenant-scoped, not client-scoped)
    if (validated.productIds && validated.productIds.length > 0) {
      const products = await this.prisma.product.findMany({
        where: {
          id: { in: validated.productIds },
          tenantId,
        },
      });

      if (products.length !== validated.productIds.length) {
        throw new BadRequestException('One or more products do not belong to the tenant');
      }
    }

    const allMediaIds = new Set(validated.mediaIds);
    if (validated.mediaPerDestination) {
      for (const ids of Object.values(validated.mediaPerDestination)) {
        ids.forEach((id) => allMediaIds.add(id));
      }
    }
    if (allMediaIds.size > 0) {
      const media = await this.prisma.media.findMany({
        where: {
          id: { in: Array.from(allMediaIds) },
          tenantId,
          OR: [
            { clientId: null },
            { clientId },
          ],
        },
      });
      if (media.length !== allMediaIds.size) {
        throw new BadRequestException('One or more media files do not belong to the tenant or client');
      }
    }

    const post = await this.prisma.post.create({
      data: {
        tenantId,
        clientId,
        status: validated.scheduledAt ? 'scheduled' : 'draft',
        scheduledAt: validated.scheduledAt ? new Date(validated.scheduledAt) : null,
        captions: {
          create: Object.entries(validated.captions).map(([platform, caption]: [string, any]) => ({
            platform: platform as any,
            caption: caption.text,
            hashtags: caption.hashtags ?? null,
            includeLink: caption.includeLink,
          })),
        },
        media: {
          create: validated.mediaIds.map((mediaId, index) => ({
            mediaId,
            order: index,
          })),
        },
        products: validated.productIds
          ? {
              create: validated.productIds.map((productId) => ({
                productId,
                isPrimary: productId === validated.primaryProductId,
              })),
            }
          : undefined,
        destinations: {
          create: validated.destinationIds.map((destinationId) => {
            const mediaOverride = validated.mediaPerDestination?.[destinationId];
            return {
              destinationId,
              status: 'draft',
              mediaIds: mediaOverride ? (mediaOverride as any) : undefined,
            };
          }),
        },
      },
      include: {
        captions: true,
        media: {
          include: {
            media: true,
          },
        },
        products: {
          include: {
            product: true,
          },
        },
        destinations: {
          include: {
            destination: {
              include: {
                integration: true,
              },
            },
          },
        },
      },
    });

    return post;
  }

  async findAll(tenantId: string, clientId?: string) {
    const where: any = { tenantId };
    if (clientId) {
      where.clientId = clientId;
    }

    const posts = await this.prisma.post.findMany({
      where,
      include: {
        client: { select: { id: true, name: true } },
        captions: true,
        media: {
          include: {
            media: true,
          },
        },
        products: {
          include: {
            product: true,
          },
        },
        destinations: {
          include: {
            destination: { include: { integration: { select: { provider: true } } } },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return this.resolveMediaUrls(posts);
  }

  async findOne(tenantId: string, id: string) {
    const post = await this.prisma.post.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        client: { select: { id: true, name: true } },
        captions: true,
        media: {
          include: {
            media: true,
          },
        },
        products: {
          include: {
            product: true,
          },
        },
        destinations: {
          include: {
            destination: {
              include: {
                integration: { select: { provider: true } },
              },
            },
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException(`Post with id "${id}" not found`);
    }

    const [resolved] = await this.resolveMediaUrls([post]);
    return resolved;
  }

  private async resolveMediaUrls(posts: any[]): Promise<any[]> {
    for (const post of posts) {
      for (const pm of post.media || []) {
        if (pm.media?.url) {
          pm.media.url = await this.mediaService.resolveMediaUrl(pm.media.url);
        }
      }
    }
    return posts;
  }

  async update(tenantId: string, id: string, updateDto: any) {
    const existing = await this.prisma.post.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!existing) {
      throw new NotFoundException(`Post with id "${id}" not found`);
    }

    const validated = updatePostSchema.parse(updateDto);

    // Update post
    return this.prisma.post.update({
      where: { id },
      data: {
        status: validated.scheduledAt ? 'scheduled' : existing.status,
        scheduledAt: validated.scheduledAt ? new Date(validated.scheduledAt) : existing.scheduledAt,
      },
      include: {
        captions: true,
        media: {
          include: {
            media: true,
          },
        },
        products: {
          include: {
            product: true,
          },
        },
        destinations: {
          include: {
            destination: true,
          },
        },
      },
    });
  }

  async publish(tenantId: string, postId: string, userId?: string) {
    const post = await this.findOne(tenantId, postId);

    if (post.status !== 'draft' && post.status !== 'scheduled' && post.status !== 'failed' && post.status !== 'publishing') {
      throw new BadRequestException(`Cannot publish post with status "${post.status}"`);
    }

    // Use publishing service to queue jobs (handles republish for failed posts)
    await this.publishingService.publishPost(tenantId, postId, userId);

    // Return updated post
    return this.findOne(tenantId, postId);
  }

  async schedule(tenantId: string, postId: string, scheduledAt: string, userId?: string) {
    const post = await this.findOne(tenantId, postId);

    if (post.status !== 'draft') {
      throw new BadRequestException(`Can only schedule posts with status "draft"`);
    }

    const scheduledDate = new Date(scheduledAt);
    if (scheduledDate < new Date()) {
      throw new BadRequestException('Scheduled time must be in the future');
    }

    const updated = await this.prisma.post.update({
      where: { id: postId },
      data: {
        status: 'scheduled',
        scheduledAt: scheduledDate,
      },
      include: {
        captions: true,
        media: {
          include: {
            media: true,
          },
        },
        products: {
          include: {
            product: true,
          },
        },
        destinations: {
          include: {
            destination: true,
          },
        },
      },
    });

    await this.auditService.log(
      tenantId,
      userId ?? null,
      'post.schedule',
      'post',
      postId,
      { scheduledAt: scheduledAt },
    );

    return updated;
  }

  async cancel(tenantId: string, postId: string, userId?: string) {
    const post = await this.findOne(tenantId, postId);

    if (post.status !== 'scheduled') {
      throw new BadRequestException(`Can only cancel posts with status "scheduled"`);
    }

    const updated = await this.prisma.post.update({
      where: { id: postId },
      data: {
        status: 'draft',
        scheduledAt: null,
      },
      include: {
        captions: true,
        media: {
          include: {
            media: true,
          },
        },
        products: {
          include: {
            product: true,
          },
        },
        destinations: {
          include: {
            destination: true,
          },
        },
      },
    });

    await this.auditService.log(
      tenantId,
      userId ?? null,
      'post.cancel',
      'post',
      postId,
      {},
    );

    return updated;
  }

  async generateProductLink(productSlug: string, platform: string): Promise<string> {
    return this.linkGenerationService.generateProductLink(productSlug, platform);
  }

  async formatCaptionWithLink(
    caption: string,
    productSlug: string | null,
    platform: string,
    includeLink: boolean,
  ): Promise<string> {
    if (!includeLink || !productSlug) {
      return caption;
    }

    const link = this.linkGenerationService.generateProductLink(productSlug, platform);
    return this.linkGenerationService.appendLinkToCaption(caption, link, platform, includeLink);
  }
}
