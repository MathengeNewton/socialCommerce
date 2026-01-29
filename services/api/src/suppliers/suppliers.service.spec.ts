import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SuppliersService', () => {
  let service: SuppliersService;
  let prisma: PrismaService;

  const mockPrismaService = {
    supplier: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    product: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuppliersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SuppliersService>(SuppliersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return suppliers filtered by tenant', async () => {
      const tenantId = 'tenant-1';
      const mockSuppliers = [
        {
          id: 'supplier-1',
          tenantId,
          name: 'Supplier A',
        },
      ];

      mockPrismaService.supplier.findMany.mockResolvedValue(mockSuppliers);

      const result = await service.findAll(tenantId);

      expect(result).toEqual(mockSuppliers);
      expect(mockPrismaService.supplier.findMany).toHaveBeenCalledWith({
        where: { tenantId },
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return supplier by id with tenant isolation', async () => {
      const tenantId = 'tenant-1';
      const supplierId = 'supplier-1';
      const mockSupplier = {
        id: supplierId,
        tenantId,
        name: 'Supplier A',
      };

      mockPrismaService.supplier.findFirst.mockResolvedValue(mockSupplier);

      const result = await service.findOne(tenantId, supplierId);

      expect(result).toEqual(mockSupplier);
      expect(mockPrismaService.supplier.findFirst).toHaveBeenCalledWith({
        where: {
          id: supplierId,
          tenantId,
        },
      });
    });

    it('should throw NotFoundException when supplier not found', async () => {
      const tenantId = 'tenant-1';
      const supplierId = 'non-existent';

      mockPrismaService.supplier.findFirst.mockResolvedValue(null);

      await expect(service.findOne(tenantId, supplierId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create supplier', async () => {
      const tenantId = 'tenant-1';
      const createDto = {
        name: 'Supplier A',
        phone: '123-456-7890',
        email: 'supplier@example.com',
        address: '123 Main St',
      };

      const mockSupplier = {
        id: 'supplier-1',
        tenantId,
        ...createDto,
      };

      mockPrismaService.supplier.create.mockResolvedValue(mockSupplier);

      const result = await service.create(tenantId, createDto);

      expect(result).toBeDefined();
      expect(mockPrismaService.supplier.create).toHaveBeenCalledWith({
        data: {
          tenantId,
          name: 'Supplier A',
          phone: '123-456-7890',
          email: 'supplier@example.com',
          address: '123 Main St',
        },
      });
    });

    it('should throw BadRequestException when name is empty', async () => {
      const tenantId = 'tenant-1';
      const createDto = {
        name: '   ',
      };

      await expect(service.create(tenantId, createDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('should update supplier', async () => {
      const tenantId = 'tenant-1';
      const supplierId = 'supplier-1';
      const updateDto = {
        name: 'Updated Supplier',
      };

      const existingSupplier = {
        id: supplierId,
        tenantId,
        name: 'Supplier A',
      };

      const updatedSupplier = {
        ...existingSupplier,
        ...updateDto,
      };

      mockPrismaService.supplier.findFirst.mockResolvedValue(existingSupplier);
      mockPrismaService.supplier.update.mockResolvedValue(updatedSupplier);

      const result = await service.update(tenantId, supplierId, updateDto);

      expect(result).toEqual(updatedSupplier);
    });

    it('should throw NotFoundException when supplier not found', async () => {
      const tenantId = 'tenant-1';
      const supplierId = 'non-existent';

      mockPrismaService.supplier.findFirst.mockResolvedValue(null);

      await expect(service.update(tenantId, supplierId, {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete supplier when no products exist', async () => {
      const tenantId = 'tenant-1';
      const supplierId = 'supplier-1';

      const existingSupplier = {
        id: supplierId,
        tenantId,
        name: 'Supplier A',
      };

      mockPrismaService.supplier.findFirst.mockResolvedValue(existingSupplier);
      mockPrismaService.product.count.mockResolvedValue(0);
      mockPrismaService.supplier.delete.mockResolvedValue(existingSupplier);

      await service.remove(tenantId, supplierId);

      expect(mockPrismaService.supplier.delete).toHaveBeenCalledWith({
        where: { id: supplierId },
      });
    });

    it('should throw BadRequestException when supplier has products', async () => {
      const tenantId = 'tenant-1';
      const supplierId = 'supplier-1';

      const existingSupplier = {
        id: supplierId,
        tenantId,
        name: 'Supplier A',
      };

      mockPrismaService.supplier.findFirst.mockResolvedValue(existingSupplier);
      mockPrismaService.product.count.mockResolvedValue(5);

      await expect(service.remove(tenantId, supplierId)).rejects.toThrow(BadRequestException);
    });
  });
});
