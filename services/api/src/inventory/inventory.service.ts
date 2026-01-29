import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async adjustStock(variantId: string, adjustment: number) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId },
    });

    if (!variant) {
      throw new NotFoundException(`Variant with id "${variantId}" not found`);
    }

    const newStock = variant.stock + adjustment;

    if (newStock < 0) {
      throw new BadRequestException(
        `Cannot adjust stock. Current: ${variant.stock}, Adjustment: ${adjustment}, Result would be negative.`,
      );
    }

    return this.prisma.productVariant.update({
      where: { id: variantId },
      data: { stock: newStock },
    });
  }

  async setStock(variantId: string, stock: number) {
    if (stock < 0) {
      throw new BadRequestException('Stock cannot be negative');
    }

    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId },
    });

    if (!variant) {
      throw new NotFoundException(`Variant with id "${variantId}" not found`);
    }

    return this.prisma.productVariant.update({
      where: { id: variantId },
      data: { stock },
    });
  }

  async checkStock(variantId: string, quantity: number): Promise<boolean> {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId },
    });

    if (!variant) {
      return false;
    }

    return variant.stock >= quantity;
  }
}
