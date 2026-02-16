import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
  Request,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../tenant/tenant.guard';
import { createProductSchema, updateProductSchema } from '@social-commerce/shared';
import { parseCsvToRows } from '../common/csv.util';

@Controller('products')
@UseGuards(JwtAuthGuard, TenantGuard)
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Post('bulk')
  async bulkImport(@Request() req, @Body() body: { rows: any[] }) {
    const rows = Array.isArray(body?.rows) ? body.rows : [];
    return this.productsService.bulkImport(req.user.tenantId, rows);
  }

  @Post('bulk/upload')
  @UseInterceptors(FileInterceptor('file'))
  async bulkUpload(@Request() req, @UploadedFile() file: Express.Multer.File) {
    if (!file?.buffer) throw new BadRequestException('File is required');
    const { rows } = parseCsvToRows(file.buffer);
    const payload = rows.map((r, i) => {
      const opts = (r.variant_options ?? r.variantoptions ?? '').split(',').map((s: string) => s.trim()).filter(Boolean);
      const prices = (r.variant_prices ?? r.variantprices ?? '').split(',').map((s: string) => parseFloat(s.trim()) || 0);
      const stocks = (r.variant_stocks ?? r.variantstocks ?? '').split(',').map((s: string) => parseInt(s.trim(), 10) || 0);
      const variantOptions =
        opts.length > 0
          ? opts.map((name: string, idx: number) => ({
              name,
              price: prices[idx] ?? undefined,
              stock: stocks[idx] ?? 0,
            }))
          : undefined;
      return {
        supplierId: (r.supplierid ?? r.supplier_id ?? '').trim(),
        categoryId: (r.categoryid ?? r.category_id ?? '').trim() || null,
        title: (r.title ?? '').trim() || `Product ${i + 1}`,
        description: (r.description ?? '').trim(),
        slug: (r.slug ?? '').trim(),
        listPrice: parseFloat(r.listprice ?? r.list_price ?? '0') || 0,
        currency: (r.currency ?? 'KES').trim().slice(0, 3),
        status: (r.status ?? 'draft').trim(),
        supplyPrice: parseFloat(r.supplyprice ?? r.supply_price ?? '') || undefined,
        minSellPrice: parseFloat(r.minsellprice ?? r.min_sell_price ?? '') || undefined,
        variantName: (r.variantname ?? r.variant_name ?? '').trim() || undefined,
        variantOptions,
      };
    });
    return this.productsService.bulkImport(req.user.tenantId, payload);
  }

  @Post()
  async create(@Request() req, @Body() body: any) {
    const validated = createProductSchema.parse(body);
    return this.productsService.create(req.user.tenantId, validated, req.user?.id);
  }

  @Get()
  async findAll(
    @Request() req,
    @Query('categoryId') categoryId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = Math.max(1, parseInt(page || '1', 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit || '10', 10) || 10));
    return this.productsService.findAll(req.user.tenantId, categoryId, pageNum, limitNum);
  }

  @Get(':slug')
  async findOne(@Request() req, @Param('slug') slug: string) {
    return this.productsService.findOne(req.user.tenantId, slug);
  }

  @Put(':id')
  async update(@Request() req, @Param('id') id: string, @Body() body: any) {
    const validated = updateProductSchema.parse(body);
    return this.productsService.update(req.user.tenantId, id, validated, req.user?.id);
  }

  @Delete(':id')
  async remove(@Request() req, @Param('id') id: string) {
    return this.productsService.remove(req.user.tenantId, id, req.user?.id);
  }
}
