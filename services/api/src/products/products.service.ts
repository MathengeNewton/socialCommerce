import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { createProductSchema, updateProductSchema } from '@social-commerce/shared';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(tenantId: string, clientId: string, createDto: any, userId?: string) {
    const validated = createProductSchema.parse(createDto);

    // Verify supplier exists and belongs to tenant
    const supplier = await this.prisma.supplier.findFirst({
      where: {
        id: validated.supplierId,
        tenantId,
      },
    });

    if (!supplier) {
      throw new BadRequestException(`Supplier with id "${validated.supplierId}" not found`);
    }

    // Check slug uniqueness per tenant
    const existing = await this.prisma.product.findFirst({
      where: {
        tenantId,
        slug: validated.slug,
      },
    });

    if (existing) {
      throw new BadRequestException(`Product with slug "${validated.slug}" already exists`);
    }

    // Validate pricing rules
    if (validated.listPrice < validated.minSellPrice) {
      throw new BadRequestException('listPrice must be >= minSellPrice');
    }

    // Create product
    const product = await this.prisma.product.create({
      data: {
        tenantId,
        clientId,
        supplierId: validated.supplierId,
        title: validated.title,
        description: validated.description,
        price: validated.listPrice, // Keep legacy field for backward compatibility
        currency: validated.currency,
        slug: validated.slug,
        status: validated.status,
        supplyPrice: validated.supplyPrice,
        minSellPrice: validated.minSellPrice,
        listPrice: validated.listPrice,
        priceDisclaimer: validated.priceDisclaimer || null,
      },
    });

    // Create variants if provided
    if (validated.variantName && validated.variantOptions) {
      const variants = validated.variantOptions.map((option) => ({
        productId: product.id,
        sku: `${validated.slug}-${option.toLowerCase().replace(/\s+/g, '-')}`,
        name: `${validated.variantName}: ${option}`,
        stock: 0,
      }));

      await this.prisma.productVariant.createMany({
        data: variants,
      });
    }

    const created = await this.findOne(tenantId, validated.slug);
    await this.auditService.log(
      tenantId,
      userId ?? null,
      'product.create',
      'product',
      created.id,
      { slug: validated.slug },
    );
    return created;
  }

  async findAll(tenantId: string, clientId?: string) {
    const where: any = { tenantId };
    if (clientId) {
      where.clientId = clientId;
    }

    return this.prisma.product.findMany({
      where,
      include: {
        supplier: true,
        variants: true,
        images: {
          include: {
            media: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(tenantId: string, slug: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        tenantId,
        slug,
      },
      include: {
        supplier: true,
        variants: true,
        images: {
          include: {
            media: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with slug "${slug}" not found`);
    }

    return product;
  }

  async update(tenantId: string, id: string, updateDto: any, userId?: string) {
    // Verify product exists and belongs to tenant
    const existing = await this.prisma.product.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!existing) {
      throw new NotFoundException(`Product with id "${id}" not found`);
    }

    const validated = updateProductSchema.parse(updateDto);

    // Verify supplier if being updated
    if (validated.supplierId && validated.supplierId !== existing.supplierId) {
      const supplier = await this.prisma.supplier.findFirst({
        where: {
          id: validated.supplierId,
          tenantId,
        },
      });

      if (!supplier) {
        throw new BadRequestException(`Supplier with id "${validated.supplierId}" not found`);
      }
    }

    // Check slug uniqueness if slug is being updated
    if (validated.slug && validated.slug !== existing.slug) {
      const slugExists = await this.prisma.product.findFirst({
        where: {
          tenantId,
          slug: validated.slug,
          id: { not: id },
        },
      });

      if (slugExists) {
        throw new BadRequestException(`Product with slug "${validated.slug}" already exists`);
      }
    }

    // Validate pricing rules if pricing fields are being updated
    const listPrice = validated.listPrice ?? Number(existing.listPrice);
    const minSellPrice = validated.minSellPrice ?? Number(existing.minSellPrice);
    if (listPrice < minSellPrice) {
      throw new BadRequestException('listPrice must be >= minSellPrice');
    }

    // Build update data
    const updateData: any = {};
    if (validated.supplierId !== undefined) updateData.supplierId = validated.supplierId;
    if (validated.title !== undefined) updateData.title = validated.title;
    if (validated.description !== undefined) updateData.description = validated.description;
    if (validated.currency !== undefined) updateData.currency = validated.currency;
    if (validated.slug !== undefined) updateData.slug = validated.slug;
    if (validated.status !== undefined) updateData.status = validated.status;
    if (validated.supplyPrice !== undefined) updateData.supplyPrice = validated.supplyPrice;
    if (validated.minSellPrice !== undefined) updateData.minSellPrice = validated.minSellPrice;
    if (validated.listPrice !== undefined) {
      updateData.listPrice = validated.listPrice;
      updateData.price = validated.listPrice; // Keep legacy field in sync
    }
    if (validated.priceDisclaimer !== undefined) {
      updateData.priceDisclaimer = validated.priceDisclaimer || null;
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        variants: true,
        images: {
          include: {
            media: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    await this.auditService.log(
      tenantId,
      userId ?? null,
      'product.update',
      'product',
      id,
      {},
    );

    return updated;
  }

  async remove(tenantId: string, id: string, userId?: string) {
    const existing = await this.prisma.product.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!existing) {
      throw new NotFoundException(`Product with id "${id}" not found`);
    }

    await this.auditService.log(
      tenantId,
      userId ?? null,
      'product.delete',
      'product',
      id,
      { slug: existing.slug },
    );

    return this.prisma.product.delete({
      where: { id },
    });
  }
}
