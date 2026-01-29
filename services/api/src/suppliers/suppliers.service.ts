import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.supplier.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with id "${id}" not found`);
    }

    return supplier;
  }

  async create(tenantId: string, data: { name: string; phone?: string; email?: string; address?: string }) {
    if (!data.name || data.name.trim().length === 0) {
      throw new BadRequestException('Supplier name is required');
    }

    return this.prisma.supplier.create({
      data: {
        tenantId,
        name: data.name.trim(),
        phone: data.phone?.trim() || null,
        email: data.email?.trim() || null,
        address: data.address?.trim() || null,
      },
    });
  }

  async update(
    tenantId: string,
    id: string,
    data: { name?: string; phone?: string; email?: string; address?: string },
  ) {
    const existing = await this.findOne(tenantId, id);

    const updateData: any = {};
    if (data.name !== undefined) {
      if (!data.name || data.name.trim().length === 0) {
        throw new BadRequestException('Supplier name cannot be empty');
      }
      updateData.name = data.name.trim();
    }
    if (data.phone !== undefined) {
      updateData.phone = data.phone?.trim() || null;
    }
    if (data.email !== undefined) {
      updateData.email = data.email?.trim() || null;
    }
    if (data.address !== undefined) {
      updateData.address = data.address?.trim() || null;
    }

    return this.prisma.supplier.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(tenantId: string, id: string) {
    const existing = await this.findOne(tenantId, id);

    // Check if supplier has products
    const productCount = await this.prisma.product.count({
      where: {
        supplierId: id,
        tenantId,
      },
    });

    if (productCount > 0) {
      throw new BadRequestException(
        `Cannot delete supplier with ${productCount} product(s). Please reassign or delete products first.`,
      );
    }

    return this.prisma.supplier.delete({
      where: { id },
    });
  }
}
