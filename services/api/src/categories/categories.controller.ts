import { Body, Controller, Delete, Get, Param, Post, Put, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../tenant/tenant.guard';
import { TenantAdminGuard } from '../auth/guards/tenant-admin.guard';
import { CategoriesService } from './categories.service';

@Controller('categories')
@UseGuards(JwtAuthGuard, TenantGuard)
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  @Get()
  async findAll(@Request() req) {
    return this.categoriesService.findAll(req.user.tenantId);
  }

  @Post()
  @UseGuards(TenantAdminGuard)
  async create(@Request() req, @Body() body: { name: string; slug?: string; order?: number }) {
    return this.categoriesService.create(req.user.tenantId, body);
  }

  @Put(':id')
  @UseGuards(TenantAdminGuard)
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { name?: string; slug?: string; order?: number },
  ) {
    return this.categoriesService.update(req.user.tenantId, id, body);
  }

  @Delete(':id')
  @UseGuards(TenantAdminGuard)
  async remove(@Request() req, @Param('id') id: string) {
    return this.categoriesService.remove(req.user.tenantId, id);
  }
}
