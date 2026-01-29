import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../tenant/tenant.guard';
import { TenantAdminGuard } from '../auth/guards/tenant-admin.guard';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, TenantGuard, TenantAdminGuard)
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('stats')
  async getStats(@Request() req: { user: { tenantId: string } }) {
    return this.dashboardService.getStats(req.user.tenantId);
  }

  @Get('activity')
  async getActivity(
    @Request() req: { user: { tenantId: string } },
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? Math.min(50, Math.max(1, parseInt(limit, 10))) : 15;
    return this.dashboardService.getActivity(req.user.tenantId, limitNum);
  }
}
