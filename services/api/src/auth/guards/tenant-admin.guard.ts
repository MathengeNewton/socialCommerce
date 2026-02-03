import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TenantAdminGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    const tenantId = request.user?.tenantId;

    if (!userId || !tenantId) {
      throw new ForbiddenException('Missing user context');
    }

    // Tenant-admin: User.role === 'admin' OR has at least one admin membership in this tenant.
    if (request.user?.role === 'admin') {
      return true;
    }

    const adminMembership = await this.prisma.membership.findFirst({
      where: {
        userId,
        role: 'admin',
        client: { tenantId },
      },
      select: { id: true },
    });

    if (!adminMembership) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}

