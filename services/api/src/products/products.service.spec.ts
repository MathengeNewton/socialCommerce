import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    supplier: {
      findFirst: jest.fn(),
    },
    product: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    productVariant: {
      createMany: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create product with variants', async () => {
      const tenantId = 'tenant-1';
      const clientId = 'client-1';
      const supplierId = '11111111-1111-1111-1111-111111111111';
      const createDto = {
        supplierId,
        title: 'Test Product',
        description: 'Test Description',
        price: 29.99,
        currency: 'USD',
        slug: 'test-product',
        status: 'published' as const,
        supplyPrice: 15.0,
        minSellPrice: 25.0,
        listPrice: 29.99,
        variantName: 'Size',
        variantOptions: ['Small', 'Medium', 'Large'],
      };

      const mockProduct = {
        id: 'product-1',
        ...createDto,
        tenantId,
        clientId,
        supplier: { id: supplierId, name: 'Supplier A' },
      };

      mockPrismaService.supplier.findFirst.mockResolvedValue({ id: supplierId, tenantId });
      mockPrismaService.product.create.mockResolvedValue(mockProduct);
      mockPrismaService.productVariant.createMany.mockResolvedValue({ count: 3 });
      // create() returns findOne() by slug, so mock the follow-up findFirst
      mockPrismaService.product.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(mockProduct);

      const result = await service.create(tenantId, clientId, createDto);

      expect(result).toBeDefined();
      expect(mockPrismaService.supplier.findFirst).toHaveBeenCalled();
      expect(mockPrismaService.product.create).toHaveBeenCalled();
      expect(mockPrismaService.productVariant.createMany).toHaveBeenCalled();
    });

    it('should enforce unique slug per tenant', async () => {
      const tenantId = 'tenant-1';
      const clientId = 'client-1';
      const supplierId = '11111111-1111-1111-1111-111111111111';
      const createDto = {
        supplierId,
        title: 'Test Product',
        description: 'Test',
        price: 10,
        currency: 'USD',
        slug: 'existing-slug',
        status: 'published' as const,
        supplyPrice: 5.0,
        minSellPrice: 8.0,
        listPrice: 10.0,
      };

      mockPrismaService.supplier.findFirst.mockResolvedValue({ id: supplierId, tenantId });
      mockPrismaService.product.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(service.create(tenantId, clientId, createDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('should return products filtered by tenant', async () => {
      const tenantId = 'tenant-1';
      const clientId = 'client-1';

      const mockProducts = [
        {
          id: 'product-1',
          title: 'Product 1',
          tenantId,
          clientId,
        },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);

      const result = await service.findAll(tenantId, clientId);

      expect(result).toEqual(mockProducts);
      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId,
            clientId,
          },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return product by slug with tenant isolation', async () => {
      const tenantId = 'tenant-1';
      const slug = 'test-product';

      const mockProduct = {
        id: 'product-1',
        slug,
        tenantId,
        supplier: { id: '11111111-1111-1111-1111-111111111111', name: 'Supplier A' },
      };

      mockPrismaService.product.findFirst.mockResolvedValueOnce(mockProduct);

      const result = await service.findOne(tenantId, slug);

      expect(result).toEqual(mockProduct);
      expect(mockPrismaService.product.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId,
            slug,
          },
        }),
      );
    });

    it('should throw NotFoundException when product not found', async () => {
      const tenantId = 'tenant-1';
      const slug = 'non-existent';

      mockPrismaService.product.findFirst.mockResolvedValueOnce(null);

      await expect(service.findOne(tenantId, slug)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update product', async () => {
      const tenantId = 'tenant-1';
      const productId = 'product-1';
      const updateDto = {
        title: 'Updated Title',
      };

      const existingProduct = {
        id: productId,
        tenantId,
      };

      const updatedProduct = {
        ...existingProduct,
        ...updateDto,
      };

      mockPrismaService.product.findFirst.mockResolvedValue(existingProduct);
      mockPrismaService.product.update.mockResolvedValue(updatedProduct);

      const result = await service.update(tenantId, productId, updateDto);

      expect(result).toEqual(updatedProduct);
    });

    it('should throw NotFoundException when product not found', async () => {
      const tenantId = 'tenant-1';
      const productId = 'non-existent';

      mockPrismaService.product.findFirst.mockResolvedValue(null);

      await expect(service.update(tenantId, productId, {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete product', async () => {
      const tenantId = 'tenant-1';
      const productId = 'product-1';

      const existingProduct = {
        id: productId,
        tenantId,
      };

      mockPrismaService.product.findFirst.mockResolvedValue(existingProduct);
      mockPrismaService.product.delete.mockResolvedValue(existingProduct);

      await service.remove(tenantId, productId);

      expect(mockPrismaService.product.delete).toHaveBeenCalledWith({
        where: { id: productId },
      });
    });
  });
});
