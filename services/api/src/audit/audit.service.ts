import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(
    tenantId: string,
    userId: string | null,
    action: string,
    entityType: string,
    entityId: string | null,
    metadata: object = {},
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action,
        entityType,
        entityId,
        metadata: metadata as any,
      },
    });
  }
}
