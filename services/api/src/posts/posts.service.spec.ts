import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PostsService } from './posts.service';
import { PrismaService } from '../prisma/prisma.service';
import { LinkGenerationService } from '../link-generation/link-generation.service';
import { PublishingService } from '../publishing/publishing.service';

describe('PostsService', () => {
  let service: PostsService;
  let prisma: PrismaService;
  let linkService: LinkGenerationService;

  const mockPrismaService = {
    client: {
      findFirst: jest.fn(),
    },
    destination: {
      findMany: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
    },
    media: {
      findMany: jest.fn(),
    },
    post: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    postCaption: {
      createMany: jest.fn(),
    },
    postMedia: {
      createMany: jest.fn(),
    },
    postProduct: {
      createMany: jest.fn(),
    },
    postDestination: {
      createMany: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const mockLinkService = {
    generateProductLink: jest.fn(),
    appendLinkToCaption: jest.fn(),
  };

  const mockPublishingService = {
    publishPost: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: LinkGenerationService,
          useValue: mockLinkService,
        },
        {
          provide: PublishingService,
          useValue: mockPublishingService,
        },
      ],
    }).compile();

    service = module.get<PostsService>(PostsService);
    prisma = module.get<PrismaService>(PrismaService);
    linkService = module.get<LinkGenerationService>(LinkGenerationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create post with captions, media, products, and destinations', async () => {
      const tenantId = 'tenant-1';
      const clientId = 'client-1';
      const createDto = {
        captions: {
          facebook: { text: 'FB caption', includeLink: true },
          instagram: { text: 'IG caption', includeLink: true },
        },
        destinationIds: [
          '11111111-1111-1111-1111-111111111111',
          '22222222-2222-2222-2222-222222222222',
        ],
        mediaIds: ['33333333-3333-3333-3333-333333333333'],
        productIds: ['44444444-4444-4444-4444-444444444444'],
        primaryProductId: '44444444-4444-4444-4444-444444444444',
      };

      const mockPost = {
        id: 'post-1',
        tenantId,
        clientId,
        status: 'draft',
      };

      // Mock validation calls
      mockPrismaService.client.findFirst.mockResolvedValue({ id: clientId, tenantId });
      mockPrismaService.destination.findMany.mockResolvedValue([
        { id: createDto.destinationIds[0] },
        { id: createDto.destinationIds[1] },
      ]);
      mockPrismaService.product.findMany.mockResolvedValue([
        { id: createDto.productIds[0] },
      ]);
      mockPrismaService.media.findMany.mockResolvedValue([
        { id: createDto.mediaIds[0] },
      ]);

      mockPrismaService.post.create.mockResolvedValue(mockPost);

      const result = await service.create(tenantId, clientId, createDto);

      expect(result).toBeDefined();
      expect(mockPrismaService.client.findFirst).toHaveBeenCalled();
      expect(mockPrismaService.destination.findMany).toHaveBeenCalled();
      expect(mockPrismaService.product.findMany).toHaveBeenCalled();
      expect(mockPrismaService.media.findMany).toHaveBeenCalled();
      expect(mockPrismaService.post.create).toHaveBeenCalled();
    });
  });

  describe('publish', () => {
    it('should update post status to publishing', async () => {
      const tenantId = 'tenant-1';
      const postId = 'post-1';

      const mockPost = {
        id: postId,
        tenantId,
        status: 'draft',
      };

      mockPrismaService.post.findFirst
        .mockResolvedValueOnce(mockPost)
        .mockResolvedValueOnce({ ...mockPost, status: 'publishing' });
      mockPublishingService.publishPost.mockResolvedValue(undefined);

      const result = await service.publish(tenantId, postId);

      expect(result.status).toBe('publishing');
      expect(mockPublishingService.publishPost).toHaveBeenCalledWith(tenantId, postId);
    });

    it('should throw BadRequestException for non-draft/scheduled posts', async () => {
      const tenantId = 'tenant-1';
      const postId = 'post-1';

      const mockPost = {
        id: postId,
        tenantId,
        status: 'published',
      };

      mockPrismaService.post.findFirst.mockResolvedValue(mockPost);

      await expect(service.publish(tenantId, postId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('schedule', () => {
    it('should schedule post for future publishing', async () => {
      const tenantId = 'tenant-1';
      const postId = 'post-1';
      const scheduledAt = new Date(Date.now() + 86400000).toISOString(); // Tomorrow

      const mockPost = {
        id: postId,
        tenantId,
        status: 'draft',
      };

      mockPrismaService.post.findFirst.mockResolvedValue(mockPost);
      mockPrismaService.post.update.mockResolvedValue({
        ...mockPost,
        status: 'scheduled',
        scheduledAt: new Date(scheduledAt),
      });

      const result = await service.schedule(tenantId, postId, scheduledAt);

      expect(result.status).toBe('scheduled');
    });

    it('should throw BadRequestException for past scheduled time', async () => {
      const tenantId = 'tenant-1';
      const postId = 'post-1';
      const scheduledAt = new Date(Date.now() - 86400000).toISOString(); // Yesterday

      const mockPost = {
        id: postId,
        tenantId,
        status: 'draft',
      };

      mockPrismaService.post.findFirst.mockResolvedValue(mockPost);

      await expect(service.schedule(tenantId, postId, scheduledAt)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('generateProductLink', () => {
    it('should generate product link with UTM parameters', async () => {
      const productSlug = 'test-product';
      const platform = 'facebook';

      mockLinkService.generateProductLink.mockReturnValue(
        'https://shop.domain/p/test-product?utm_source=facebook&utm_medium=social&utm_campaign=post',
      );

      const result = await service.generateProductLink(productSlug, platform);

      expect(result).toContain('shop.domain/p/');
      expect(result).toContain('utm_source=facebook');
      expect(mockLinkService.generateProductLink).toHaveBeenCalledWith(productSlug, platform);
    });
  });
});
