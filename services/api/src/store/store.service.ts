import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StoreService {
  constructor(private prisma: PrismaService) {}

  async getProducts(options: {
    page: number;
    limit: number;
    search?: string;
    clientId?: string;
  }) {
    const where: any = {
      status: 'published',
    };

    if (options.clientId) {
      where.clientId = options.clientId;
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
          variants: true,
          images: {
            include: {
              media: true,
            },
            orderBy: {
              order: 'asc',
            },
            take: 1, // Just first image for listing
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

  async getProduct(slug: string, clientId?: string) {
    const where: any = {
      slug,
      status: 'published',
    };

    if (clientId) {
      where.clientId = clientId;
    }

    const product = await this.prisma.product.findFirst({
      where,
      include: {
        supplier: true,
        variants: {
          where: {
            stock: {
              gt: 0,
            },
          },
        },
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
}
