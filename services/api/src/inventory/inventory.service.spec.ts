import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../prisma/prisma.service';

describe('InventoryService', () => {
  let service: InventoryService;
  let prisma: PrismaService;

  const mockPrismaService = {
    productVariant: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('adjustStock', () => {
    it('should increase stock', async () => {
      const variantId = 'variant-1';
      const adjustment = 10;

      const mockVariant = {
        id: variantId,
        stock: 5,
      };

      mockPrismaService.productVariant.findFirst.mockResolvedValue(mockVariant);
      mockPrismaService.productVariant.update.mockResolvedValue({
        ...mockVariant,
        stock: 15,
      });

      const result = await service.adjustStock(variantId, adjustment);

      expect(result.stock).toBe(15);
      expect(mockPrismaService.productVariant.update).toHaveBeenCalledWith({
        where: { id: variantId },
        data: { stock: 15 },
      });
    });

    it('should decrease stock', async () => {
      const variantId = 'variant-1';
      const adjustment = -5;

      const mockVariant = {
        id: variantId,
        stock: 10,
      };

      mockPrismaService.productVariant.findFirst.mockResolvedValue(mockVariant);
      mockPrismaService.productVariant.update.mockResolvedValue({
        ...mockVariant,
        stock: 5,
      });

      const result = await service.adjustStock(variantId, adjustment);

      expect(result.stock).toBe(5);
    });

    it('should throw BadRequestException when stock would go negative', async () => {
      const variantId = 'variant-1';
      const adjustment = -20;

      const mockVariant = {
        id: variantId,
        stock: 10,
      };

      mockPrismaService.productVariant.findFirst.mockResolvedValue(mockVariant);

      await expect(service.adjustStock(variantId, adjustment)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when variant not found', async () => {
      const variantId = 'non-existent';
      mockPrismaService.productVariant.findFirst.mockResolvedValue(null);

      await expect(service.adjustStock(variantId, 10)).rejects.toThrow(NotFoundException);
    });
  });

  describe('setStock', () => {
    it('should set stock to specific value', async () => {
      const variantId = 'variant-1';
      const stock = 25;

      const mockVariant = {
        id: variantId,
        stock: 10,
      };

      mockPrismaService.productVariant.findFirst.mockResolvedValue(mockVariant);
      mockPrismaService.productVariant.update.mockResolvedValue({
        ...mockVariant,
        stock: 25,
      });

      const result = await service.setStock(variantId, stock);

      expect(result.stock).toBe(25);
    });

    it('should throw BadRequestException when setting negative stock', async () => {
      const variantId = 'variant-1';
      const stock = -5;

      const mockVariant = {
        id: variantId,
        stock: 10,
      };

      mockPrismaService.productVariant.findFirst.mockResolvedValue(mockVariant);

      await expect(service.setStock(variantId, stock)).rejects.toThrow(BadRequestException);
    });
  });
});
