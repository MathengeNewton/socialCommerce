import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats(tenantId: string) {
    const [
      products,
      publishedProducts,
      draftProducts,
      featuredProducts,
      lowStockVariants,
      orders,
      pendingOrders,
      quotedOrders,
      completedOrders,
      ordersNeedingReview,
      orderTotals,
      receiptsTotal,
      posts,
      scheduledPosts,
      publishedPosts,
      failedPosts,
      integrations,
      clients,
      activeClients,
      staff,
      suppliers,
      categories,
      messagesUnread,
      messagesLast7Days,
      activePackages,
      storefrontSettings,
    ] =
      await Promise.all([
        this.prisma.product.count({ where: { tenantId } }),
        this.prisma.product.count({ where: { tenantId, status: 'published' } }),
        this.prisma.product.count({ where: { tenantId, status: 'draft' } }),
        this.prisma.product.count({ where: { tenantId, isFeatured: true, status: 'published' } }),
        this.prisma.productVariant.count({ where: { product: { tenantId }, stock: { lte: 5, gt: 0 } } }),
        this.prisma.order.count({ where: { tenantId } }),
        this.prisma.order.count({ where: { tenantId, status: 'pending' } }),
        this.prisma.order.count({ where: { tenantId, status: 'quoted' } }),
        this.prisma.order.count({ where: { tenantId, status: 'complete' } }),
        this.prisma.order.count({ where: { tenantId, isGenuine: null } }),
        this.prisma.order.aggregate({
          where: { tenantId },
          _sum: { total: true, finalTotal: true },
        }),
        this.prisma.receipt.aggregate({
          where: { tenantId },
          _sum: { totalPaid: true },
        }),
        this.prisma.post.count({ where: { tenantId } }),
        this.prisma.post.count({ where: { tenantId, status: 'scheduled' } }),
        this.prisma.post.count({ where: { tenantId, status: 'published' } }),
        this.prisma.post.count({ where: { tenantId, status: 'failed' } }),
        this.prisma.integration.count({ where: { tenantId } }),
        this.prisma.client.count({ where: { tenantId } }),
        this.prisma.client.count({ where: { tenantId, active: true } }),
        this.prisma.user.count({ where: { tenantId } }),
        this.prisma.supplier.count({ where: { tenantId } }),
        this.prisma.productCategory.count({ where: { tenantId } }),
        this.prisma.contactMessage.count({
          where: { tenantId, readAt: null },
        }),
        this.prisma.contactMessage.count({
          where: {
            tenantId,
            createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        }),
        this.prisma.servicePackage.count({ where: { tenantId, isActive: true } }),
        this.prisma.storefrontSettings.findUnique({
          where: { tenantId },
          select: { heroImageMediaId: true },
        }),
      ]);
    return {
      products,
      orders,
      posts,
      integrations,
      clients,
      messagesUnread,
      overview: {
        publishedProducts,
        draftProducts,
        featuredProducts,
        lowStockVariants,
        pendingOrders,
        quotedOrders,
        completedOrders,
        ordersNeedingReview,
        scheduledPosts,
        publishedPosts,
        failedPosts,
        activeClients,
        staff,
        suppliers,
        categories,
        activePackages,
        heroImageConfigured: Boolean(storefrontSettings?.heroImageMediaId),
        messagesLast7Days,
      },
      revenue: {
        grossOrderValue: Number(orderTotals._sum.total ?? 0),
        finalizedOrderValue: Number(orderTotals._sum.finalTotal ?? 0),
        collectedRevenue: Number(receiptsTotal._sum.totalPaid ?? 0),
        averageOrderValue: orders > 0 ? Number(orderTotals._sum.total ?? 0) / orders : 0,
      },
    };
  }

  async getActivity(tenantId: string, limit = 15) {
    const [recentPosts, recentClients, recentOrders, recentMessages] = await Promise.all([
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
      this.prisma.contactMessage.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: { id: true, name: true, createdAt: true, readAt: true },
      }),
    ]);

    const items: Array<{
      type: 'post' | 'client' | 'order' | 'message';
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
      ...recentMessages.map((m) => ({
        type: 'message' as const,
        id: m.id,
        label: `${m.readAt ? 'Message' : 'Unread message'} from ${m.name}`,
        createdAt: m.createdAt,
      })),
    ];

    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return items.slice(0, limit);
  }
}
