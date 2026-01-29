import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.user?.tenantId;

    if (!tenantId) {
      throw new ForbiddenException('Tenant not found in request');
    }

    // Verify user belongs to tenant
    const user = await this.prisma.user.findUnique({
      where: { id: request.user.id },
      select: { tenantId: true },
    });

    if (!user || user.tenantId !== tenantId) {
      throw new ForbiddenException('Invalid tenant access');
    }

    return true;
  }
}
