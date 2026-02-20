import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    tenantId: string,
    options?: { page?: number; limit?: number },
  ) {
    const page = Math.max(1, options?.page ?? 1);
    const limit = Math.min(100, Math.max(1, options?.limit ?? 50));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.contactMessage.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          phone: true,
          message: true,
          readAt: true,
          createdAt: true,
        },
      }),
      this.prisma.contactMessage.count({ where: { tenantId } }),
    ]);

    return {
      items: items.map((m) => ({
        id: m.id,
        name: m.name,
        phone: m.phone,
        message: m.message,
        readAt: m.readAt?.toISOString() ?? null,
        createdAt: m.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
    };
  }

  async getUnreadCount(tenantId: string): Promise<number> {
    return this.prisma.contactMessage.count({
      where: { tenantId, readAt: null },
    });
  }

  async markAsRead(tenantId: string, id: string) {
    const msg = await this.prisma.contactMessage.findFirst({
      where: { id, tenantId },
    });
    if (!msg) return null;
    return this.prisma.contactMessage.update({
      where: { id },
      data: { readAt: new Date() },
      select: {
        id: true,
        name: true,
        phone: true,
        message: true,
        readAt: true,
        createdAt: true,
      },
    });
  }
}
