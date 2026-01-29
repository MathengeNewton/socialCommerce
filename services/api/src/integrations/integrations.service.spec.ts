import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

describe('IntegrationsService', () => {
  let service: IntegrationsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    integration: {
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
    destination: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn(() => '12345678901234567890123456789012'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegrationsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<IntegrationsService>(IntegrationsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('connect', () => {
    it('should create or update integration with encrypted tokens', async () => {
      const tenantId = 'tenant-1';
      const clientId = 'client-1';
      const provider = 'facebook';
      const code = 'auth-code-123';

      mockPrismaService.integration.findFirst.mockResolvedValue(null);
      mockPrismaService.integration.create.mockImplementation(async ({ data }) => ({
        id: 'integration-1',
        ...data,
      }));
      mockPrismaService.destination.findFirst.mockResolvedValue(null);
      mockPrismaService.destination.create.mockResolvedValue({});

      const result = await service.connect(tenantId, clientId, provider, code);

      expect(result).toBeDefined();
      expect(mockPrismaService.integration.create).toHaveBeenCalled();
      expect(result.accessToken).toContain(':'); // Encrypted format
    });
  });

  describe('findAll', () => {
    it('should return integrations filtered by tenant', async () => {
      const tenantId = 'tenant-1';
      const clientId = 'client-1';

      const mockIntegrations = [
        {
          id: 'integration-1',
          tenantId,
          clientId,
          provider: 'facebook',
        },
      ];

      mockPrismaService.integration.findMany.mockResolvedValue(mockIntegrations);

      const result = await service.findAll(tenantId, clientId);

      expect(result).toEqual(mockIntegrations);
      expect(mockPrismaService.integration.findMany).toHaveBeenCalledWith({
        where: { tenantId, clientId },
        include: { destinations: true },
      });
    });
  });

  describe('disconnect', () => {
    it('should delete integration', async () => {
      const tenantId = 'tenant-1';
      const integrationId = 'integration-1';

      const mockIntegration = {
        id: integrationId,
        tenantId,
      };

      mockPrismaService.integration.findFirst.mockResolvedValue(mockIntegration);
      mockPrismaService.integration.delete.mockResolvedValue(mockIntegration);

      const result = await service.disconnect(tenantId, integrationId);

      expect(result.success).toBe(true);
      expect(mockPrismaService.integration.delete).toHaveBeenCalledWith({
        where: { id: integrationId },
      });
    });

    it('should throw NotFoundException when integration not found', async () => {
      const tenantId = 'tenant-1';
      const integrationId = 'non-existent';

      mockPrismaService.integration.findFirst.mockResolvedValue(null);

      await expect(service.disconnect(tenantId, integrationId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('encryptToken/decryptToken', () => {
    it('should encrypt and decrypt tokens correctly', () => {
      const originalToken = 'test-access-token-12345';
      const encrypted = service['encryptToken'](originalToken);
      const decrypted = service.decryptToken(encrypted);

      expect(encrypted).not.toBe(originalToken);
      expect(encrypted).toContain(':'); // IV:encrypted format
      expect(decrypted).toBe(originalToken);
    });
  });
});
