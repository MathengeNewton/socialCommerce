import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { CartService } from '../cart/cart.service';
import { AuditService } from '../audit/audit.service';
import { createOrderSchema } from '@social-commerce/shared';
import { randomBytes } from 'crypto';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private inventoryService: InventoryService,
    private cartService: CartService,
    private auditService: AuditService,
  ) {}

  async create(tenantId: string, clientId: string, createDto: any) {
    const validated = createOrderSchema.parse(createDto);

    // Validate cart items and check stock
    const validatedItems = await this.cartService.validateCartItems(
      validated.items as any,
    );

    // Calculate total
    const total = validatedItems.reduce(
      (sum, item) => sum + Number(item.price) * item.quantity,
      0,
    );

    // Generate public ID
    const publicId = `ORD-${randomBytes(4).toString('hex').toUpperCase()}`;

    // Create order
    const order = await this.prisma.order.create({
      data: {
        tenantId,
        clientId,
        publicId,
        customerName: validated.customerName,
        customerEmail: validated.customerEmail,
        customerPhone: validated.customerPhone || null,
        customerAddress: validated.customerAddress || null,
        status: 'pending',
        total,
        quotedTotal: total, // Set quoted total equal to calculated total
        currency: 'USD',
        items: {
          create: validatedItems.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    // Decrement inventory
    for (const item of validatedItems) {
      if (item.variantId) {
        await this.inventoryService.adjustStock(item.variantId, -item.quantity);
      }
    }

    return order;
  }

  async findAll(tenantId: string, clientId?: string) {
    const where: any = { tenantId };
    if (clientId) {
      where.clientId = clientId;
    }

    return this.prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
        receipt: true,
        priceOverrideByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(tenantId: string, publicId: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        tenantId,
        publicId,
      },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
        receipt: true,
        priceOverrideByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with publicId "${publicId}" not found`);
    }

    return order;
  }

  async updateStatus(
    tenantId: string,
    orderId: string,
    status: string,
    userId?: string,
  ) {
    const existing = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        tenantId,
      },
    });

    if (!existing) {
      throw new NotFoundException(`Order with id "${orderId}" not found`);
    }

    const previousStatus = existing.status;

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    await this.auditService.log(
      tenantId,
      userId ?? null,
      'order.status_change',
      'order',
      orderId,
      { previousStatus, newStatus: status },
    );

    return updated;
  }

  async overridePrice(
    tenantId: string,
    orderId: string,
    finalTotal: number,
    userId: string,
    reason: string,
  ) {
    const existing = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        tenantId,
      },
    });

    if (!existing) {
      throw new NotFoundException(`Order with id "${orderId}" not found`);
    }

    if (existing.status !== 'pending') {
      throw new BadRequestException('Can only override price for pending orders');
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        finalTotal,
        priceOverrideByUserId: userId,
        priceOverrideReason: reason,
      },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
        priceOverrideByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }
}
