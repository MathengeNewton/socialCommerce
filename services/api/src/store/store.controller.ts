import { Controller, Get, Post, Put, Delete, Body, Param, Query, BadRequestException } from '@nestjs/common';
import { StoreService } from './store.service';
import { CartService } from '../cart/cart.service';
import { OrdersService } from '../orders/orders.service';
import { createOrderSchema } from '@social-commerce/shared';

@Controller('store')
export class StoreController {
  constructor(
    private storeService: StoreService,
    private cartService: CartService,
    private ordersService: OrdersService,
  ) {}

  @Get('categories')
  async getCategories(
    @Query('tenantId') tenantId?: string,
    @Query('withProductCount') withProductCount?: string,
  ) {
    return this.storeService.getCategories(tenantId, withProductCount === 'true');
  }

  @Get('products')
  async getProducts(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('categorySlug') categorySlug?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('supplierId') supplierId?: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.storeService.getProducts({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      search,
      categoryId,
      categorySlug,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      supplierId,
      tenantId,
    });
  }

  @Get('products/:slug')
  async getProduct(@Param('slug') slug: string, @Query('tenantId') tenantId?: string) {
    return this.storeService.getProduct(slug, tenantId);
  }

  @Get('orders/:publicId')
  async getOrderByPublicId(@Param('publicId') publicId: string) {
    return this.storeService.getOrderByPublicId(publicId);
  }

  // Cart (public, tenant-scoped)
  @Get('cart')
  async getCart(
    @Query('tenantId') tenantId: string,
    @Query('cartToken') cartToken: string,
  ) {
    if (!tenantId || !cartToken) {
      throw new BadRequestException('tenantId and cartToken required');
    }
    return this.cartService.getOrCreateCart(tenantId, cartToken);
  }

  @Post('cart/add')
  async addToCart(
    @Body() body: { tenantId: string; cartToken: string; productId: string; quantity: number; variantId?: string },
  ) {
    const { tenantId, cartToken, productId, quantity, variantId } = body;
    if (!tenantId || !cartToken || !productId || !quantity) {
      throw new BadRequestException('tenantId, cartToken, productId, quantity required');
    }
    return this.cartService.addToCart(tenantId, cartToken, productId, quantity, variantId);
  }

  @Put('cart/update')
  async updateCartItem(
    @Body() body: { tenantId: string; cartToken: string; itemId: string; quantity: number },
  ) {
    const { tenantId, cartToken, itemId, quantity } = body;
    if (!tenantId || !cartToken || !itemId) {
      throw new BadRequestException('tenantId, cartToken, itemId required');
    }
    return this.cartService.updateItem(tenantId, cartToken, itemId, quantity ?? 1);
  }

  @Delete('cart/remove')
  async removeFromCart(
    @Query('tenantId') tenantId: string,
    @Query('cartToken') cartToken: string,
    @Query('itemId') itemId: string,
  ) {
    if (!tenantId || !cartToken || !itemId) {
      throw new BadRequestException('tenantId, cartToken, itemId required');
    }
    return this.cartService.removeItem(tenantId, cartToken, itemId);
  }

  @Post('contact')
  async submitContact(
    @Body() body: { tenantId: string; name: string; phone: string; message: string },
  ) {
    const { tenantId, name, phone, message } = body;
    if (!tenantId || !name || !phone || !message) {
      throw new BadRequestException('tenantId, name, phone, and message required');
    }
    return this.storeService.submitContact(tenantId, { name, phone, message });
  }

  @Post('orders')
  async createOrder(@Body() body: any) {
    const { tenantId, ...rest } = body;
    if (!tenantId) throw new BadRequestException('tenantId required');
    const order = await this.ordersService.create(tenantId, rest);
    // Clear cart after order
    const cartToken = body.cartToken;
    if (cartToken) {
      await this.cartService.clearCart(tenantId, cartToken);
    }
    return {
      publicId: order.publicId,
      status: order.status,
      total: Number(order.total),
      currency: order.currency,
      customerName: order.customerName,
      createdAt: order.createdAt,
      items: order.items.map((i) => ({
        productName: i.product?.title,
        quantity: i.quantity,
        price: Number(i.price),
      })),
    };
  }
}
