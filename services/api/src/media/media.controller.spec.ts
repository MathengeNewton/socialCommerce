import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../tenant/tenant.guard';

describe('MediaController', () => {
  let controller: MediaController;
  let mediaService: MediaService;

  const mockMediaService = {
    createUpload: jest.fn(),
    confirmUpload: jest.fn(),
    getMedia: jest.fn(),
  };

  beforeEach(async () => {
    const moduleBuilder = Test.createTestingModule({
      controllers: [MediaController],
      providers: [
        {
          provide: MediaService,
          useValue: mockMediaService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(TenantGuard)
      .useValue({ canActivate: () => true });

    const module: TestingModule = await moduleBuilder.compile();

    controller = module.get<MediaController>(MediaController);
    mediaService = module.get<MediaService>(MediaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /media/uploads', () => {
    it('should return upload URL and media ID', async () => {
      const req = {
        user: {
          id: 'user-1',
          tenantId: 'tenant-1',
        },
        body: {
          clientId: 'client-1',
          mimeType: 'image/png',
          size: 1024 * 1024,
        },
      };

      const mockResult = {
        mediaId: 'media-1',
        uploadUrl: 'https://s3.example.com/upload',
      };

      mockMediaService.createUpload.mockResolvedValue(mockResult);

      const result = await controller.createUpload(req as any);

      expect(result).toEqual(mockResult);
      expect(mockMediaService.createUpload).toHaveBeenCalledWith(
        'tenant-1',
        'client-1',
        'image/png',
        1024 * 1024,
      );
    });

    it('should throw BadRequestException for invalid mime type', async () => {
      const req = {
        user: {
          id: 'user-1',
          tenantId: 'tenant-1',
        },
        body: {
          clientId: 'client-1',
          mimeType: 'application/pdf',
          size: 1024,
        },
      };
      await expect(controller.createUpload(req as any)).rejects.toThrow();
    });
  });

  describe('POST /media/:id/confirm', () => {
    it('should confirm upload and return media', async () => {
      const req = {
        params: { id: '33333333-3333-3333-3333-333333333333' },
        body: {
          width: 1920,
          height: 1080,
        },
      };

      const mockMedia = {
        id: '33333333-3333-3333-3333-333333333333',
        url: 'https://s3.example.com/media/123.png',
        width: 1920,
        height: 1080,
      };

      mockMediaService.confirmUpload.mockResolvedValue(mockMedia);

      const result = await controller.confirmUpload(req.params.id, req.body);

      expect(result).toEqual(mockMedia);
      expect(mockMediaService.confirmUpload).toHaveBeenCalledWith('33333333-3333-3333-3333-333333333333', {
        width: 1920,
        height: 1080,
        duration: null,
      });
    });
  });
});
