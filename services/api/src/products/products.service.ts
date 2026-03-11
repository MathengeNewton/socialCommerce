import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { createProductSchema, updateProductSchema } from '@social-commerce/shared';
import type { BulkImportResult, BulkImportRowResult } from '@social-commerce/shared';

type ProductBulkImportRow = {
  supplierId?: string;
  supplierName?: string;
  categoryId?: string | null;
  categoryName?: string;
  title: string;
  description: string;
  slug: string;
  listPrice: number;
  currency?: string;
  status?: string;
  supplyPrice?: number;
  minSellPrice?: number;
  priceDisclaimer?: string;
  variantName?: string;
  variantOptions?: Array<string | { name: string; price?: number; currency?: string; stock?: number }>;
};

type NamedRecord = {
  id: string;
  name: string;
  slug?: string | null;
};

const normalizeMatcherValue = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

const slugifyValue = (value: string) => normalizeMatcherValue(value).replace(/\s+/g, '-');

const levenshteinDistance = (left: string, right: string) => {
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = new Array(right.length + 1).fill(0);

  for (let row = 1; row <= left.length; row++) {
    current[0] = row;
    for (let column = 1; column <= right.length; column++) {
      const substitutionCost = left[row - 1] === right[column - 1] ? 0 : 1;
      current[column] = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + substitutionCost,
      );
    }
    for (let column = 0; column <= right.length; column++) {
      previous[column] = current[column];
    }
  }

  return previous[right.length];
};

const calculateNameSimilarity = (left: string, right: string) => {
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.includes(right) || right.includes(left)) return 0.93;

  const leftTokens = new Set(left.split(' ').filter(Boolean));
  const rightTokens = new Set(right.split(' ').filter(Boolean));
  const overlapCount = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const tokenScore = overlapCount / Math.max(leftTokens.size, rightTokens.size, 1);
  const distance = levenshteinDistance(left, right);
  const distanceScore = 1 - distance / Math.max(left.length, right.length, 1);

  return Math.max(tokenScore, distanceScore);
};

const findBestRecordMatch = <T extends NamedRecord>(records: T[], rawValue: string, minimumScore = 0.74): T | null => {
  const normalizedValue = normalizeMatcherValue(rawValue);
  if (!normalizedValue) return null;

  const exact = records.find((record) => {
    const normalizedName = normalizeMatcherValue(record.name);
    const normalizedSlug = record.slug ? normalizeMatcherValue(record.slug) : '';
    return normalizedName === normalizedValue || normalizedSlug === normalizedValue;
  });
  if (exact) return exact;

  let bestMatch: T | null = null;
  let bestScore = 0;
  for (const record of records) {
    const score = Math.max(
      calculateNameSimilarity(normalizeMatcherValue(record.name), normalizedValue),
      record.slug ? calculateNameSimilarity(normalizeMatcherValue(record.slug), normalizedValue) : 0,
    );
    if (score > bestScore) {
      bestScore = score;
      bestMatch = record;
    }
  }

  return bestScore >= minimumScore ? bestMatch : null;
};

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
        isFeatured: validated.isFeatured ?? false,
        featuredOrder: validated.featuredOrder ?? 0,
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
    if (validated.isFeatured !== undefined) {
      updateData.isFeatured = validated.isFeatured;
    }
    if (validated.featuredOrder !== undefined) {
      updateData.featuredOrder = validated.featuredOrder;
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

  private async resolveSupplierId(
    tenantId: string,
    row: ProductBulkImportRow,
    suppliers: Array<{ id: string; name: string }>,
  ) {
    const supplierId = row.supplierId?.trim();
    if (supplierId) {
      const supplier = suppliers.find((item) => item.id === supplierId);
      if (!supplier) {
        throw new BadRequestException(`Supplier with id "${supplierId}" not found`);
      }
      return supplier.id;
    }

    const supplierName = row.supplierName?.trim();
    if (supplierName) {
      const matchedSupplier = findBestRecordMatch(suppliers, supplierName, 0.8);
      if (matchedSupplier) {
        return matchedSupplier.id;
      }
      const createdSupplier = await this.createSupplierForImport(tenantId, supplierName);
      suppliers.push(createdSupplier);
      return createdSupplier.id;
    }

    if (suppliers.length === 1) {
      return suppliers[0].id;
    }

    throw new BadRequestException('Supplier is required. Provide supplier_id or supplier_name in the CSV.');
  }

  private async createSupplierForImport(tenantId: string, name: string) {
    return this.prisma.supplier.create({
      data: {
        tenantId,
        name: name.trim(),
        phone: 'PENDING-UPDATE',
        email: null,
        address: 'Auto-created from bulk product upload. Update supplier details later.',
      },
      select: {
        id: true,
        name: true,
      },
    });
  }

  private async resolveCategoryId(
    tenantId: string,
    row: ProductBulkImportRow,
    categories: Array<{ id: string; name: string; slug: string }>,
  ) {
    const categoryId = row.categoryId?.trim();
    if (categoryId) {
      const category = categories.find((item) => item.id === categoryId);
      if (!category) {
        throw new BadRequestException(`Category with id "${categoryId}" not found`);
      }
      return category.id;
    }

    const categoryName = row.categoryName?.trim();
    if (!categoryName) {
      return null;
    }

    const matchedCategory = findBestRecordMatch(categories, categoryName, 0.72);
    if (matchedCategory) {
      return matchedCategory.id;
    }

    const createdCategory = await this.createCategoryForImport(tenantId, categoryName);
    categories.push(createdCategory);
    return createdCategory.id;
  }

  private async createCategoryForImport(tenantId: string, name: string) {
    const slug = await this.buildUniqueCategorySlug(tenantId, name);
    return this.prisma.productCategory.create({
      data: {
        tenantId,
        name: name.trim(),
        slug,
        order: 0,
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });
  }

  private async buildUniqueCategorySlug(tenantId: string, name: string) {
    const baseSlug = slugifyValue(name) || 'category';
    let candidate = baseSlug;
    let suffix = 2;

    while (
      await this.prisma.productCategory.findFirst({
        where: { tenantId, slug: candidate },
        select: { id: true },
      })
    ) {
      candidate = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }

  /** Bulk import: one product per row (with optional variants). Process each row; do not fail whole batch. */
  async bulkImport(
    tenantId: string,
    rows: ProductBulkImportRow[],
  ): Promise<BulkImportResult> {
    const results: BulkImportRowResult[] = [];
    const [suppliers, categories] = await Promise.all([
      this.prisma.supplier.findMany({
        where: { tenantId },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.productCategory.findMany({
        where: { tenantId },
        select: { id: true, name: true, slug: true },
        orderBy: [{ order: 'asc' }, { name: 'asc' }],
      }),
    ]);

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      try {
        const supplierId = await this.resolveSupplierId(tenantId, row, suppliers);
        const categoryId = await this.resolveCategoryId(tenantId, row, categories);
        const slug =
          row.slug?.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') ||
          row.title?.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') ||
          `product-${rowIndex + 1}`;
        const listPrice = Number(row.listPrice);
        const createDto = {
          supplierId,
          categoryId,
          title: row.title?.trim() || 'Untitled',
          description: row.description?.trim() ?? '',
          slug,
          price: listPrice,
          listPrice,
          currency: row.currency?.trim().slice(0, 3).toUpperCase() || 'KES',
          status: row.status?.trim().toLowerCase() === 'published' ? 'published' : 'draft',
          supplyPrice: row.supplyPrice != null ? Number(row.supplyPrice) : listPrice,
          minSellPrice: row.minSellPrice != null ? Number(row.minSellPrice) : listPrice,
          priceDisclaimer: row.priceDisclaimer?.trim() || undefined,
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
