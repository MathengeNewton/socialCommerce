import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LinkGenerationService } from '../link-generation/link-generation.service';
import { PublishingService } from '../publishing/publishing.service';
import { AuditService } from '../audit/audit.service';
import { createPostSchema, updatePostSchema } from '@social-commerce/shared';

@Injectable()
export class PostsService {
  constructor(
    private prisma: PrismaService,
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

    // Validate products belong to the client
    if (validated.productIds && validated.productIds.length > 0) {
      const products = await this.prisma.product.findMany({
        where: {
          id: { in: validated.productIds },
          tenantId,
          clientId,
        },
      });

      if (products.length !== validated.productIds.length) {
        throw new BadRequestException('One or more products do not belong to the selected client');
      }
    }

    // Validate media belongs to tenant (and optionally client)
    if (validated.mediaIds && validated.mediaIds.length > 0) {
      const media = await this.prisma.media.findMany({
        where: {
          id: { in: validated.mediaIds },
          tenantId,
          OR: [
            { clientId: null }, // Tenant-level media
            { clientId }, // Client-specific media
          ],
        },
      });

      if (media.length !== validated.mediaIds.length) {
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
          create: validated.destinationIds.map((destinationId) => ({
            destinationId,
            status: 'draft',
          })),
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

    return this.prisma.post.findMany({
      where,
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
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(tenantId: string, id: string) {
    const post = await this.prisma.post.findFirst({
      where: {
        id,
        tenantId,
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

    if (!post) {
      throw new NotFoundException(`Post with id "${id}" not found`);
    }

    return post;
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

    if (post.status !== 'draft' && post.status !== 'scheduled') {
      throw new BadRequestException(`Cannot publish post with status "${post.status}"`);
    }

    // Use publishing service to queue jobs
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
