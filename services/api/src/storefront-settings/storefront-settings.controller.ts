import { Body, Controller, Get, Put, Request, UseGuards } from '@nestjs/common';
import { updateStorefrontSettingsSchema } from '@social-commerce/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantAdminGuard } from '../auth/guards/tenant-admin.guard';
import { TenantGuard } from '../tenant/tenant.guard';
import { StorefrontSettingsService } from './storefront-settings.service';

@Controller('storefront-settings')
@UseGuards(JwtAuthGuard, TenantGuard)
export class StorefrontSettingsController {
  constructor(private readonly storefrontSettingsService: StorefrontSettingsService) {}

  @Get()
  async getSettings(@Request() req) {
    return this.storefrontSettingsService.getSettings(req.user.tenantId);
  }

  @Put()
  @UseGuards(TenantAdminGuard)
  async updateSettings(@Request() req, @Body() body: unknown) {
    const validated = updateStorefrontSettingsSchema.parse(body);
    return this.storefrontSettingsService.updateSettings(req.user.tenantId, validated);
  }
}
