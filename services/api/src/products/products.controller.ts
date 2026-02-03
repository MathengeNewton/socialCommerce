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
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../tenant/tenant.guard';
import { createProductSchema, updateProductSchema } from '@social-commerce/shared';

@Controller('products')
@UseGuards(JwtAuthGuard, TenantGuard)
export class ProductsController {
  constructor(private productsService: ProductsService) {}

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
