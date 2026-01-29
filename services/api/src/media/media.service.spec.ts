import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { MediaService } from './media.service';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '@social-commerce/shared';

describe('MediaService', () => {
  let service: MediaService;
  let prisma: PrismaService;
  let s3Service: S3Service;

  const mockPrismaService = {
    media: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockS3Service = {
    getSignedUploadUrl: jest.fn(),
    getSignedUrl: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: S3Service,
          useValue: mockS3Service,
        },
      ],
    }).compile();

    service = module.get<MediaService>(MediaService);
    prisma = module.get<PrismaService>(PrismaService);
    s3Service = module.get<S3Service>(S3Service);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createUpload', () => {
    it('should create upload request with signed URL for valid mime type', async () => {
      const tenantId = 'tenant-1';
      const clientId = 'client-1';
      const mimeType = 'image/png';
      const size = 1024 * 1024; // 1MB

      mockS3Service.getSignedUploadUrl.mockResolvedValue({
        uploadUrl: 'https://s3.example.com/upload',
        key: 'media/123.png',
      });

      mockPrismaService.media.create.mockResolvedValue({
        id: 'media-1',
        url: 'https://s3.example.com/media/123.png',
        mimeType,
        size,
      });

      const result = await service.createUpload(tenantId, clientId, mimeType, size);

      expect(result).toHaveProperty('mediaId');
      expect(result).toHaveProperty('uploadUrl');
      expect(mockS3Service.getSignedUploadUrl).toHaveBeenCalled();
      expect(mockPrismaService.media.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid mime type', async () => {
      const tenantId = 'tenant-1';
      const clientId = 'client-1';
      const mimeType = 'application/pdf';
      const size = 1024;

      await expect(
        service.createUpload(tenantId, clientId, mimeType, size),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for file size exceeding limit', async () => {
      const tenantId = 'tenant-1';
      const clientId = 'client-1';
      const mimeType = 'image/png';
      const size = MAX_FILE_SIZE + 1;

      await expect(
        service.createUpload(tenantId, clientId, mimeType, size),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('confirmUpload', () => {
    it('should confirm upload and update media metadata', async () => {
      const mediaId = 'media-1';
      const metadata = {
        width: 1920,
        height: 1080,
        duration: null,
      };

      const mockMedia = {
        id: mediaId,
        url: 'https://s3.example.com/media/123.png',
        mimeType: 'image/png',
        size: 1024,
        width: null,
        height: null,
        duration: null,
      };

      mockPrismaService.media.findUnique.mockResolvedValue(mockMedia);
      mockPrismaService.media.update.mockResolvedValue({
        ...mockMedia,
        ...metadata,
      });

      const result = await service.confirmUpload(mediaId, metadata);

      expect(result.width).toBe(metadata.width);
      expect(result.height).toBe(metadata.height);
      expect(mockPrismaService.media.update).toHaveBeenCalledWith({
        where: { id: mediaId },
        data: metadata,
      });
    });

    it('should throw when media not found', async () => {
      const mediaId = 'non-existent';
      mockPrismaService.media.findUnique.mockResolvedValue(null);

      await expect(
        service.confirmUpload(mediaId, { width: 100, height: 100, duration: null }),
      ).rejects.toThrow();
    });
  });
});
