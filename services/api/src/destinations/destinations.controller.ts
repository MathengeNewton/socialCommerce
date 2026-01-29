import { Controller, Get, Post, Param, UseGuards, Request, Query } from '@nestjs/common';
import { DestinationsService } from './destinations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../tenant/tenant.guard';

@Controller('destinations')
@UseGuards(JwtAuthGuard, TenantGuard)
export class DestinationsController {
  constructor(private destinationsService: DestinationsService) {}

  @Get()
  async findAll(@Request() req, @Query('clientId') clientId?: string) {
    return this.destinationsService.findAll(req.user.tenantId, clientId);
  }

  @Post(':integrationId/refresh')
  async refresh(@Request() req, @Param('integrationId') integrationId: string) {
    return this.destinationsService.refresh(req.user.tenantId, integrationId);
  }
}
