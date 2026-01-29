import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { CartService } from '../cart/cart.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: PrismaService;
  let inventoryService: InventoryService;

  const mockPrismaService = {
    order: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    orderItem: {
      createMany: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
    },
  };

  const mockInventoryService = {
    checkStock: jest.fn(),
    adjustStock: jest.fn(),
  };

  const mockCartService = {
    validateCartItems: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: InventoryService,
          useValue: mockInventoryService,
        },
        {
          provide: CartService,
          useValue: mockCartService,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    prisma = module.get<PrismaService>(PrismaService);
    inventoryService = module.get<InventoryService>(InventoryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create order and decrement inventory', async () => {
      const tenantId = 'tenant-1';
      const clientId = 'client-1';
      const createDto = {
        items: [
          {
            productId: '44444444-4444-4444-4444-444444444444',
            variantId: '55555555-5555-5555-5555-555555555555',
            quantity: 2,
          },
        ],
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
      };

      const validatedItems = [
        {
          productId: '44444444-4444-4444-4444-444444444444',
          variantId: '55555555-5555-5555-5555-555555555555',
          quantity: 2,
          price: 29.99,
        },
      ];

      mockCartService.validateCartItems.mockResolvedValue(validatedItems);
      mockInventoryService.checkStock.mockResolvedValue(true);

      const mockOrder = {
        id: 'order-1',
        publicId: 'ORD-123',
        total: 59.98,
        items: [],
      };

      mockPrismaService.order.create.mockResolvedValue(mockOrder);
      mockPrismaService.orderItem.createMany.mockResolvedValue({ count: 1 });

      const result = await service.create(tenantId, clientId, createDto);

      expect(result).toBeDefined();
      expect(mockPrismaService.order.create).toHaveBeenCalled();
      expect(mockInventoryService.adjustStock).toHaveBeenCalled();
    });

    it('should throw BadRequestException when stock is insufficient', async () => {
      const tenantId = 'tenant-1';
      const clientId = 'client-1';
      const createDto = {
        items: [
          {
            productId: '44444444-4444-4444-4444-444444444444',
            variantId: '55555555-5555-5555-5555-555555555555',
            quantity: 100,
          },
        ],
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
      };

      mockCartService.validateCartItems.mockRejectedValue(
        new Error('Insufficient stock'),
      );

      await expect(service.create(tenantId, clientId, createDto)).rejects.toThrow();
    });
  });

  describe('findAll', () => {
    it('should return orders filtered by tenant', async () => {
      const tenantId = 'tenant-1';
      const clientId = 'client-1';

      const mockOrders = [
        {
          id: 'order-1',
          tenantId,
          clientId,
        },
      ];

      mockPrismaService.order.findMany.mockResolvedValue(mockOrders);

      const result = await service.findAll(tenantId, clientId);

      expect(result).toEqual(mockOrders);
      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId,
            clientId,
          },
          include: expect.objectContaining({
            items: expect.anything(),
            receipt: expect.anything(),
            priceOverrideByUser: expect.anything(),
          }),
        }),
      );
    });
  });

  describe('updateStatus', () => {
    it('should update order status', async () => {
      const tenantId = 'tenant-1';
      const orderId = 'order-1';
      const status = 'processing';

      const existingOrder = {
        id: orderId,
        tenantId,
        status: 'pending',
      };

      mockPrismaService.order.findFirst.mockResolvedValue(existingOrder);
      mockPrismaService.order.update.mockResolvedValue({
        ...existingOrder,
        status,
      });

      const result = await service.updateStatus(tenantId, orderId, status);

      expect(result.status).toBe(status);
    });

    it('should throw NotFoundException when order not found', async () => {
      const tenantId = 'tenant-1';
      const orderId = 'non-existent';

      mockPrismaService.order.findFirst.mockResolvedValue(null);

      await expect(service.updateStatus(tenantId, orderId, 'processing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('overridePrice', () => {
    it('should override price for pending order', async () => {
      const tenantId = 'tenant-1';
      const orderId = 'order-1';
      const userId = 'user-1';
      const finalTotal = 50.0;
      const reason = 'Customer discount';

      const existingOrder = {
        id: orderId,
        tenantId,
        status: 'pending',
        quotedTotal: 100.0,
      };

      mockPrismaService.order.findFirst.mockResolvedValue(existingOrder);
      mockPrismaService.order.update.mockResolvedValue({
        ...existingOrder,
        finalTotal,
        priceOverrideByUserId: userId,
        priceOverrideReason: reason,
      });

      const result = await service.overridePrice(tenantId, orderId, finalTotal, userId, reason);

      expect(result.finalTotal).toBe(finalTotal);
      expect(result.priceOverrideByUserId).toBe(userId);
      expect(result.priceOverrideReason).toBe(reason);
    });

    it('should throw BadRequestException for non-pending order', async () => {
      const tenantId = 'tenant-1';
      const orderId = 'order-1';
      const userId = 'user-1';
      const finalTotal = 50.0;
      const reason = 'Customer discount';

      const existingOrder = {
        id: orderId,
        tenantId,
        status: 'processing',
      };

      mockPrismaService.order.findFirst.mockResolvedValue(existingOrder);

      await expect(
        service.overridePrice(tenantId, orderId, finalTotal, userId, reason),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
