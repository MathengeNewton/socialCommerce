import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats(tenantId: string) {
    const [products, orders, posts, integrations, clients, messagesUnread] =
      await Promise.all([
        this.prisma.product.count({ where: { tenantId } }),
        this.prisma.order.count({ where: { tenantId } }),
        this.prisma.post.count({ where: { tenantId } }),
        this.prisma.integration.count({ where: { tenantId } }),
        this.prisma.client.count({ where: { tenantId } }),
        this.prisma.contactMessage.count({
          where: { tenantId, readAt: null },
        }),
      ]);
    return {
      products,
      orders,
      posts,
      integrations,
      clients,
      messagesUnread,
    };
  }

  async getActivity(tenantId: string, limit = 15) {
    const [recentPosts, recentClients, recentOrders] = await Promise.all([
      this.prisma.post.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: { id: true, status: true, createdAt: true },
      }),
      this.prisma.client.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: { id: true, name: true, createdAt: true },
      }),
      this.prisma.order.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: { id: true, publicId: true, customerName: true, createdAt: true },
      }),
    ]);

    const items: Array<{
      type: 'post' | 'client' | 'order';
      id: string;
      label: string;
      createdAt: Date;
    }> = [
      ...recentPosts.map((p) => ({
        type: 'post' as const,
        id: p.id,
        label: `Post ${p.status}`,
        createdAt: p.createdAt,
      })),
      ...recentClients.map((c) => ({
        type: 'client' as const,
        id: c.id,
        label: c.name,
        createdAt: c.createdAt,
      })),
      ...recentOrders.map((o) => ({
        type: 'order' as const,
        id: o.id,
        label: `Order #${o.publicId} (${o.customerName})`,
        createdAt: o.createdAt,
      })),
    ];

    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return items.slice(0, limit);
  }
}
