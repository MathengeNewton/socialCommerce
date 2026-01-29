import { Controller, Get, Param, Query } from '@nestjs/common';
import { StoreService } from './store.service';

@Controller('store')
export class StoreController {
  constructor(private storeService: StoreService) {}

  @Get('products')
  async getProducts(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('clientId') clientId?: string,
  ) {
    return this.storeService.getProducts({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      search,
      clientId,
    });
  }

  @Get('products/:slug')
  async getProduct(@Param('slug') slug: string, @Query('clientId') clientId?: string) {
    return this.storeService.getProduct(slug, clientId);
  }

  @Get('orders/:publicId')
  async getOrderByPublicId(@Param('publicId') publicId: string) {
    return this.storeService.getOrderByPublicId(publicId);
  }
}
