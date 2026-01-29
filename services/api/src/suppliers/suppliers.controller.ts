import { Body, Controller, Delete, Get, Param, Post, Put, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../tenant/tenant.guard';
import { TenantAdminGuard } from '../auth/guards/tenant-admin.guard';
import { SuppliersService } from './suppliers.service';

@Controller('suppliers')
@UseGuards(JwtAuthGuard, TenantGuard, TenantAdminGuard)
export class SuppliersController {
  constructor(private suppliersService: SuppliersService) {}

  @Get()
  async findAll(@Request() req) {
    return this.suppliersService.findAll(req.user.tenantId);
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    return this.suppliersService.findOne(req.user.tenantId, id);
  }

  @Post()
  async create(
    @Request() req,
    @Body() body: { name: string; phone?: string; email?: string; address?: string },
  ) {
    return this.suppliersService.create(req.user.tenantId, body);
  }

  @Put(':id')
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { name?: string; phone?: string; email?: string; address?: string },
  ) {
    return this.suppliersService.update(req.user.tenantId, id, body);
  }

  @Delete(':id')
  async remove(@Request() req, @Param('id') id: string) {
    return this.suppliersService.remove(req.user.tenantId, id);
  }
}
