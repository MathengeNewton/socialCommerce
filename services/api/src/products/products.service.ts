import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { createProductSchema, updateProductSchema } from '@social-commerce/shared';
import type { BulkImportResult, BulkImportRowResult } from '@social-commerce/shared';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(tenantId: string, createDto: any, userId?: string) {
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
        supplierId: validated.supplierId,
        categoryId: validated.categoryId || null,
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

    // Create product images if provided
    if (validated.imageIds && validated.imageIds.length > 0) {
      await this.prisma.productImage.createMany({
        data: validated.imageIds.map((mediaId, index) => ({
          productId: product.id,
          mediaId,
          order: index,
        })),
      });
    }

    // Create variants if provided (each with optional price/currency/stock)
    if (validated.variantName && validated.variantOptions?.length) {
      const variantRows = validated.variantOptions.map((option) => {
        const isObj = typeof option === 'object' && option !== null && 'name' in option;
        const name = isObj ? (option as { name: string }).name : String(option);
        const price = isObj ? (option as { price?: number }).price : undefined;
        const currency = isObj ? (option as { currency?: string }).currency : undefined;
        const stock = isObj ? (option as { stock?: number }).stock ?? 0 : 0;
        return {
          productId: product.id,
          sku: `${validated.slug}-${name.toLowerCase().replace(/\s+/g, '-')}`,
          name: validated.variantName ? `${validated.variantName}: ${name}` : name,
          stock,
          price: price != null ? price : undefined,
          currency: currency ?? undefined,
        };
      });
      await this.prisma.productVariant.createMany({
        data: variantRows,
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

  async findAll(
    tenantId: string,
    categoryId?: string,
    page = 1,
    limit = 10,
  ): Promise<{ products: any[]; total: number; page: number; limit: number; totalPages: number }> {
    const where: any = { tenantId };
    if (categoryId) {
      where.categoryId = categoryId;
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          supplier: true,
          category: { select: { id: true, name: true, slug: true } },
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
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findOne(tenantId: string, slug: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        tenantId,
        slug,
      },
      include: {
        supplier: true,
        category: { select: { id: true, name: true, slug: true } },
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
    if (validated.categoryId !== undefined) {
      updateData.categoryId = validated.categoryId || null;
    }

    // Replace variants if provided
    if (validated.variantName !== undefined && validated.variantOptions !== undefined) {
      await this.prisma.productVariant.deleteMany({ where: { productId: id } });
      if (validated.variantOptions.length > 0) {
        const variantRows = validated.variantOptions.map((option) => {
          const isObj = typeof option === 'object' && option !== null && 'name' in option;
          const name = isObj ? (option as { name: string }).name : String(option);
          const price = isObj ? (option as { price?: number }).price : undefined;
          const currency = isObj ? (option as { currency?: string }).currency : undefined;
          const stock = isObj ? (option as { stock?: number }).stock ?? 0 : 0;
          return {
            productId: id,
            sku: `${updateData.slug ?? existing.slug}-${name.toLowerCase().replace(/\s+/g, '-')}`,
            name: validated.variantName ? `${validated.variantName}: ${name}` : name,
            stock,
            price: price != null ? price : undefined,
            currency: currency ?? undefined,
          };
        });
        await this.prisma.productVariant.createMany({ data: variantRows });
      }
    }

    // Update product images if provided
    if (validated.imageIds !== undefined) {
      await this.prisma.productImage.deleteMany({ where: { productId: id } });
      if (validated.imageIds.length > 0) {
        await this.prisma.productImage.createMany({
          data: validated.imageIds.map((mediaId, index) => ({
            productId: id,
            mediaId,
            order: index,
          })),
        });
      }
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

  /** Bulk import: one product per row (with optional variants). Process each row; do not fail whole batch. */
  async bulkImport(
    tenantId: string,
    rows: Array<{
      supplierId: string;
      categoryId?: string | null;
      title: string;
      description: string;
      slug: string;
      listPrice: number;
      currency?: string;
      status?: string;
      supplyPrice?: number;
      minSellPrice?: number;
      variantName?: string;
      variantOptions?: Array<string | { name: string; price?: number; currency?: string; stock?: number }>;
    }>,
  ): Promise<BulkImportResult> {
    const results: BulkImportRowResult[] = [];
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      try {
        const slug =
          row.slug?.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') ||
          row.title?.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') ||
          `product-${rowIndex + 1}`;
        const createDto = {
          supplierId: row.supplierId,
          categoryId: row.categoryId ?? null,
          title: row.title?.trim() ?? 'Untitled',
          description: row.description?.trim() ?? '',
          slug,
          listPrice: Number(row.listPrice) || 0,
          currency: row.currency ?? 'KES',
          status: row.status === 'published' ? 'published' : 'draft',
          supplyPrice: row.supplyPrice != null ? Number(row.supplyPrice) : Number(row.listPrice) || 0,
          minSellPrice: row.minSellPrice != null ? Number(row.minSellPrice) : Number(row.listPrice) || 0,
          variantName: row.variantName?.trim() || undefined,
          variantOptions: row.variantOptions,
        };
        const created = await this.create(tenantId, createDto);
        results.push({ rowIndex: rowIndex + 1, success: true, id: created.id });
      } catch (err: any) {
        results.push({
          rowIndex: rowIndex + 1,
          success: false,
          error: err?.message ?? String(err),
        });
      }
    }
    const succeeded = results.filter((r) => r.success).length;
    return {
      summary: { total: rows.length, succeeded, failed: rows.length - succeeded },
      results,
    };
  }
}
