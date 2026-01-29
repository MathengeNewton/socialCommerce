import { Test, TestingModule } from '@nestjs/testing';
import { PublishingProcessor } from './publishing.processor';
import { PrismaService } from '../../../api/src/prisma/prisma.service';
import { IntegrationsService } from '../../../api/src/integrations/integrations.service';
import { RATE_LIMITS } from '@social-commerce/shared';

describe('PublishingProcessor', () => {
  let processor: PublishingProcessor;
  let prisma: PrismaService;
  let integrationsService: IntegrationsService;

  const mockPrismaService = {
    postDestination: {
      update: jest.fn(),
    },
  };

  const mockIntegrationsService = {
    decryptToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublishingProcessor,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: IntegrationsService,
          useValue: mockIntegrationsService,
        },
      ],
    }).compile();

    processor = module.get<PublishingProcessor>(PublishingProcessor);
    prisma = module.get<PrismaService>(PrismaService);
    integrationsService = module.get<IntegrationsService>(IntegrationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processPublish', () => {
    it('should publish to platform and update status', async () => {
      const job = {
        data: {
          postId: 'post-1',
          destinationId: 'dest-1',
          platform: 'facebook',
          caption: 'Test caption',
          mediaUrls: [],
          accessToken: 'encrypted-token',
          integrationId: 'integration-1',
        },
      };

      mockIntegrationsService.decryptToken.mockReturnValue('decrypted-token');
      mockPrismaService.postDestination.update.mockResolvedValue({});

      // Mock platform-specific publish function
      processor['publishToFacebook'] = jest.fn().mockResolvedValue({ id: 'external-post-123' });

      await processor.processPublish(job as any);

      expect(mockPrismaService.postDestination.update).toHaveBeenCalledWith({
        where: {
          postId_destinationId: {
            postId: 'post-1',
            destinationId: 'dest-1',
          },
        },
        data: {
          status: 'published',
          externalPostId: 'external-post-123',
          publishedAt: expect.any(Date),
        },
      });
    });

    it('should handle publishing errors and update status to failed', async () => {
      const job = {
        data: {
          postId: 'post-1',
          destinationId: 'dest-1',
          platform: 'facebook',
          caption: 'Test',
          mediaUrls: [],
          accessToken: 'encrypted-token',
          integrationId: 'integration-1',
        },
      };

      mockIntegrationsService.decryptToken.mockReturnValue('decrypted-token');
      processor['publishToFacebook'] = jest.fn().mockRejectedValue(new Error('API Error'));

      await processor.processPublish(job as any);

      expect(mockPrismaService.postDestination.update).toHaveBeenCalledWith({
        where: {
          postId_destinationId: {
            postId: 'post-1',
            destinationId: 'dest-1',
          },
        },
        data: {
          status: 'failed',
          error: expect.stringContaining('API Error'),
        },
      });
    });
  });
});
