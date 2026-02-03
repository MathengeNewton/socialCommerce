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

  async create(tenantId: string, createDto: any) {
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
        publicId,
        customerName: validated.customerName,
        customerEmail: validated.customerEmail,
        customerPhone: validated.customerPhone || null,
        customerAddress: validated.customerAddress || null,
        deliveryType: validated.deliveryType ?? 'pickup',
        customerPreference: validated.customerPreference || null,
        status: 'pending',
        total,
        quotedTotal: total,
        currency: 'KES',
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

  async findAll(tenantId: string) {
    const where = { tenantId };

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

  async updateFulfillment(
    tenantId: string,
    orderIdOrPublicId: string,
    data: {
      isGenuine?: boolean;
      fulfillmentNotes?: string;
      status?: string;
      finalTotal?: number;
    },
    userId?: string,
  ) {
    const isPublicId = orderIdOrPublicId.startsWith('ORD-');
    const where = isPublicId
      ? { publicId: orderIdOrPublicId, tenantId }
      : { id: orderIdOrPublicId, tenantId };
    const existing = await this.prisma.order.findFirst({ where });
    if (!existing) {
      throw new NotFoundException(`Order not found`);
    }

    const updateData: any = {};
    if (data.isGenuine !== undefined) updateData.isGenuine = data.isGenuine;
    if (data.fulfillmentNotes !== undefined) updateData.fulfillmentNotes = data.fulfillmentNotes;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.finalTotal !== undefined) {
      updateData.finalTotal = data.finalTotal;
      if (userId) {
        updateData.priceOverrideByUserId = userId;
        updateData.priceOverrideReason = 'Selling price set by attendant';
      }
    }

    return this.prisma.order.update({
      where: { id: existing.id },
      data: updateData,
      include: {
        items: { include: { product: true, variant: true } },
        priceOverrideByUser: { select: { id: true, name: true, email: true } },
      },
    });
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

    if (existing.status !== 'pending' && existing.status !== 'contacted' && existing.status !== 'quoted') {
      throw new BadRequestException('Can only override price for pending/contacted/quoted orders');
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
