import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';

@Injectable()
export class CartService {
  constructor(
    private prisma: PrismaService,
    private inventoryService: InventoryService,
  ) {}

  async validateCartItems(items: Array<{ productId: string; variantId?: string; quantity: number }>) {
    const validatedItems = [];

    for (const item of items) {
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
        include: {
          variants: item.variantId ? { where: { id: item.variantId } } : false,
        },
      });

      if (!product) {
        throw new Error(`Product ${item.productId} not found`);
      }

      if (product.status !== 'published') {
        throw new Error(`Product ${item.productId} is not available`);
      }

      if (item.variantId) {
        const variant = product.variants?.find((v) => v.id === item.variantId);
        if (!variant) {
          throw new Error(`Variant ${item.variantId} not found`);
        }
        if (variant.stock < item.quantity) {
          throw new Error(`Insufficient stock for variant ${item.variantId}`);
        }
      }

      validatedItems.push({
        productId: item.productId,
        variantId: item.variantId || null,
        quantity: item.quantity,
        price: product.price,
      });
    }

    return validatedItems;
  }
}
