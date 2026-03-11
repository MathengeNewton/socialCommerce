import { Body, Controller, Delete, Get, Param, Post, Put, Request, UseGuards } from '@nestjs/common';
import { createServicePackageSchema, updateServicePackageSchema } from '@social-commerce/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantAdminGuard } from '../auth/guards/tenant-admin.guard';
import { TenantGuard } from '../tenant/tenant.guard';
import { ServicePackagesService } from './service-packages.service';

@Controller('service-packages')
@UseGuards(JwtAuthGuard, TenantGuard)
export class ServicePackagesController {
  constructor(private readonly servicePackagesService: ServicePackagesService) {}

  @Get()
  async findAll(@Request() req) {
    return this.servicePackagesService.findAll(req.user.tenantId);
  }

  @Post()
  @UseGuards(TenantAdminGuard)
  async create(@Request() req, @Body() body: unknown) {
    const validated = createServicePackageSchema.parse(body);
    return this.servicePackagesService.create(req.user.tenantId, validated);
  }

  @Put(':id')
  @UseGuards(TenantAdminGuard)
  async update(@Request() req, @Param('id') id: string, @Body() body: unknown) {
    const validated = updateServicePackageSchema.parse(body);
    return this.servicePackagesService.update(req.user.tenantId, id, validated);
  }

  @Delete(':id')
  @UseGuards(TenantAdminGuard)
  async remove(@Request() req, @Param('id') id: string) {
    return this.servicePackagesService.remove(req.user.tenantId, id);
  }
}
