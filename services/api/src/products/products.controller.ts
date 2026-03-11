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
import { getCsvValue, parseCsvToRows } from '../common/csv.util';

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
    const isCsv =
      file.originalname?.toLowerCase().endsWith('.csv') ||
      file.mimetype === 'text/csv' ||
      file.mimetype === 'application/vnd.ms-excel';
    if (!isCsv) throw new BadRequestException('Only CSV files are supported');
    const { rows } = parseCsvToRows(file.buffer);
    const payload = rows.map((r, i) => {
      const opts = getCsvValue(r, 'variant_options', 'variant options', 'variantOptions')
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean);
      const prices = getCsvValue(r, 'variant_prices', 'variant prices', 'variantPrices')
        .split(',')
        .map((s: string) => {
        const value = s.trim();
        if (!value) return undefined;
        const parsed = parseFloat(value);
        return Number.isFinite(parsed) ? parsed : undefined;
      });
      const stocks = getCsvValue(r, 'variant_stocks', 'variant stocks', 'variantStocks')
        .split(',')
        .map((s: string) => parseInt(s.trim(), 10) || 0);
      const variantOptions =
        opts.length > 0
          ? opts.map((name: string, idx: number) => ({
              name,
              price: prices[idx] ?? undefined,
              stock: stocks[idx] ?? 0,
            }))
          : undefined;
      return {
        supplierId: getCsvValue(r, 'supplier_id', 'supplierId').trim(),
        supplierName: getCsvValue(r, 'supplier_name', 'supplier name', 'supplierName', 'supplier').trim() || undefined,
        categoryId: getCsvValue(r, 'category_id', 'categoryId').trim() || null,
        categoryName: getCsvValue(r, 'category_name', 'category name', 'categoryName', 'category').trim() || undefined,
        title: getCsvValue(r, 'title').trim() || `Product ${i + 1}`,
        description: getCsvValue(r, 'description').trim(),
        slug: getCsvValue(r, 'slug').trim(),
        listPrice: parseFloat(getCsvValue(r, 'list_price', 'list price', 'listPrice') || '0') || 0,
        currency: (getCsvValue(r, 'currency') || 'KES').trim().slice(0, 3),
        status: (getCsvValue(r, 'status') || 'draft').trim(),
        supplyPrice: parseFloat(getCsvValue(r, 'supply_price', 'supply price', 'supplyPrice') || '') || undefined,
        minSellPrice: parseFloat(getCsvValue(r, 'min_sell_price', 'min sell price', 'minSellPrice') || '') || undefined,
        priceDisclaimer: getCsvValue(r, 'price_disclaimer', 'price disclaimer', 'priceDisclaimer').trim() || undefined,
        variantName: getCsvValue(r, 'variant_name', 'variant name', 'variantName').trim() || undefined,
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
