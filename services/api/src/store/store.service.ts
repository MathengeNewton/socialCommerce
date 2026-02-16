import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StoreService {
  constructor(private prisma: PrismaService) {}

  async getCategories(tenantId?: string, withProductCount?: boolean) {
    if (!tenantId) return [];

    const categories = await this.prisma.productCategory.findMany({
      where: { tenantId },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      include:
        withProductCount
          ? { _count: { select: { products: true } } }
          : undefined,
    });
    return categories.map((c) => {
      const base = { id: c.id, name: c.name, slug: c.slug, order: c.order };
      if (withProductCount && '_count' in c) {
        return { ...base, productCount: (c as any)._count?.products ?? 0 };
      }
      return base;
    });
  }

  async getProducts(options: {
    page: number;
    limit: number;
    search?: string;
    categoryId?: string;
    categorySlug?: string;
    minPrice?: number;
    maxPrice?: number;
    supplierId?: string;
    tenantId?: string;
  }) {
    const where: any = {
      status: 'published',
    };

    if (options.tenantId) {
      where.tenantId = options.tenantId;
    }

    if (options.categoryId) {
      where.categoryId = options.categoryId;
    }

    if (options.categorySlug) {
      const cat = await this.prisma.productCategory.findFirst({
        where: { slug: options.categorySlug },
        select: { id: true },
      });
      if (cat) where.categoryId = cat.id;
    }

    if (options.supplierId) {
      where.supplierId = options.supplierId;
    }

    if (options.minPrice != null || options.maxPrice != null) {
      where.listPrice = {};
      if (options.minPrice != null) where.listPrice.gte = options.minPrice;
      if (options.maxPrice != null) where.listPrice.lte = options.maxPrice;
    }

    if (options.search) {
      where.OR = [
        { title: { contains: options.search, mode: 'insensitive' } },
        { description: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const skip = (options.page - 1) * options.limit;

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: options.limit,
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
            take: 1,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      products,
      pagination: {
        page: options.page,
        limit: options.limit,
        total,
        totalPages: Math.ceil(total / options.limit),
      },
    };
  }

  async getProduct(slug: string, tenantId?: string) {
    const where: any = {
      slug,
      status: 'published',
    };

    if (tenantId) {
      where.tenantId = tenantId;
    }

    const product = await this.prisma.product.findFirst({
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
    });

    if (!product) {
      throw new NotFoundException(`Product with slug "${slug}" not found`);
    }

    // Ensure variants are loaded (workaround if include was ever filtered or not applied)
    if (product.variants.length === 0) {
      const withVariants = await this.prisma.product.findUnique({
        where: { id: product.id },
        select: { variants: true },
      });
      if (withVariants?.variants?.length) {
        (product as { variants: typeof withVariants.variants }).variants = withVariants.variants;
      }
    }

    return product;
  }

  async getOrderByPublicId(publicId: string) {
    const order = await this.prisma.order.findUnique({
      where: { publicId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with publicId "${publicId}" not found`);
    }

    return {
      publicId: order.publicId,
      status: order.status,
      total: Number(order.total),
      currency: order.currency,
      customerName: order.customerName,
      createdAt: order.createdAt,
      items: order.items.map((item) => ({
        productName: item.product?.title ?? 'Unknown',
        quantity: item.quantity,
        price: Number(item.price),
      })),
    };
  }

  async submitContact(tenantId: string, data: { name: string; phone: string; message: string }) {
    const { name, phone, message } = data;
    if (!name?.trim() || !phone?.trim() || !message?.trim()) {
      throw new Error('Name, phone, and message are required');
    }
    return this.prisma.contactMessage.create({
      data: {
        tenantId,
        name: name.trim(),
        phone: phone.trim(),
        message: message.trim(),
      },
    });
  }
}
