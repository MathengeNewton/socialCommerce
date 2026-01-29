import { Test, TestingModule } from '@nestjs/testing';
import { PublishingService } from './publishing.service';
import { PrismaService } from '../prisma/prisma.service';
import { Queue } from 'bullmq';
import { getQueueToken } from '@nestjs/bullmq';
import { LinkGenerationService } from '../link-generation/link-generation.service';

describe('PublishingService', () => {
  let service: PublishingService;
  let prisma: PrismaService;
  let queue: Queue;

  const mockPrismaService = {
    post: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    postDestination: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockQueue = {
    add: jest.fn(),
  };

  const mockLinkService = {
    generateProductLink: jest.fn(),
    appendLinkToCaption: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublishingService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: getQueueToken('publishing'),
          useValue: mockQueue,
        },
        {
          provide: LinkGenerationService,
          useValue: mockLinkService,
        },
      ],
    }).compile();

    service = module.get<PublishingService>(PublishingService);
    prisma = module.get<PrismaService>(PrismaService);
    queue = module.get<Queue>(getQueueToken('publishing'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('publishPost', () => {
    it('should create jobs for each destination', async () => {
      const tenantId = 'tenant-1';
      const postId = 'post-1';

      const mockPost = {
        id: postId,
        tenantId,
        status: 'draft',
        products: [],
        captions: [{ platform: 'facebook', caption: 'hi', includeLink: false }],
        media: [{ media: { url: 'https://example.com/1.png' } }],
        destinations: [
          {
            id: 'dest-1',
            destinationId: 'dest-1',
            destination: {
              integration: { id: 'int-1', provider: 'facebook', accessToken: 'token' },
            },
          },
          {
            id: 'dest-2',
            destinationId: 'dest-2',
            destination: {
              integration: { id: 'int-2', provider: 'facebook', accessToken: 'token' },
            },
          },
        ],
      };

      mockPrismaService.post.findFirst.mockResolvedValue(mockPost);
      mockPrismaService.post.update.mockResolvedValue({ ...mockPost, status: 'publishing' });
      mockQueue.add.mockResolvedValue({ id: 'job-1' });

      await service.publishPost(tenantId, postId);

      expect(mockQueue.add).toHaveBeenCalledTimes(2);
      expect(mockQueue.add).toHaveBeenCalledWith(
        'publish',
        expect.objectContaining({
          postId,
          destinationId: 'dest-1',
        }),
        expect.objectContaining({
          jobId: expect.stringContaining('post-1-dest-1'),
        }),
      );
    });

    it('should use idempotency key', async () => {
      const tenantId = 'tenant-1';
      const postId = 'post-1';
      const destinationId = 'dest-1';

      const mockPost = {
        id: postId,
        tenantId,
        status: 'draft',
        products: [],
        captions: [{ platform: 'facebook', caption: 'hi', includeLink: false }],
        media: [{ media: { url: 'https://example.com/1.png' } }],
        destinations: [
          {
            id: 'dest-1',
            destinationId,
            destination: {
              integration: { id: 'int-1', provider: 'facebook', accessToken: 'token' },
            },
          },
        ],
      };

      mockPrismaService.post.findFirst.mockResolvedValue(mockPost);
      mockPrismaService.post.update.mockResolvedValue({ ...mockPost, status: 'publishing' });
      mockQueue.add.mockResolvedValue({ id: 'job-1' });

      await service.publishPost(tenantId, postId);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'publish',
        expect.any(Object),
        expect.objectContaining({
          jobId: `${postId}-${destinationId}`,
        }),
      );
    });
  });
});
