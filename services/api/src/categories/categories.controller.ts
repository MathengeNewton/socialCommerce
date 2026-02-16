import { Body, Controller, Delete, Get, Param, Post, Put, Request, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../tenant/tenant.guard';
import { TenantAdminGuard } from '../auth/guards/tenant-admin.guard';
import { CategoriesService } from './categories.service';
import { parseCsvToRows } from '../common/csv.util';

@Controller('categories')
@UseGuards(JwtAuthGuard, TenantGuard)
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  @Get()
  async findAll(@Request() req) {
    return this.categoriesService.findAll(req.user.tenantId);
  }

  @Post('bulk')
  @UseGuards(TenantAdminGuard)
  async bulkImport(
    @Request() req,
    @Body() body: { rows: Array<{ name: string; slug?: string; order?: number }> },
  ) {
    const rows = Array.isArray(body?.rows) ? body.rows : [];
    return this.categoriesService.bulkImport(req.user.tenantId, rows);
  }

  @Post('bulk/upload')
  @UseGuards(TenantAdminGuard)
  @UseInterceptors(FileInterceptor('file'))
  async bulkUpload(@Request() req, @UploadedFile() file: Express.Multer.File) {
    if (!file?.buffer) throw new BadRequestException('File is required');
    const { rows } = parseCsvToRows(file.buffer);
    const payload = rows.map((r, i) => ({
      name: (r.name ?? '').trim(),
      slug: (r.slug ?? '').trim() || undefined,
      order: r.order ? parseInt(r.order, 10) : i + 1,
    }));
    return this.categoriesService.bulkImport(req.user.tenantId, payload);
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
