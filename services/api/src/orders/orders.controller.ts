import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  UseGuards,
  Request,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../tenant/tenant.guard';
import { TenantAdminGuard } from '../auth/guards/tenant-admin.guard';
import { createOrderSchema } from '@social-commerce/shared';

@Controller('orders')
@UseGuards(JwtAuthGuard, TenantGuard)
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  async create(@Request() req, @Body() body: any) {
    const validated = createOrderSchema.parse(body);
    return this.ordersService.create(
      req.user.tenantId,
      req.body.clientId || req.query.clientId,
      validated,
    );
  }

  @Get()
  async findAll(@Request() req, @Query('clientId') clientId?: string) {
    return this.ordersService.findAll(req.user.tenantId, clientId);
  }

  @Get(':publicId')
  async findOne(@Request() req, @Param('publicId') publicId: string) {
    return this.ordersService.findOne(req.user.tenantId, publicId);
  }

  @Put(':id/status')
  async updateStatus(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.ordersService.updateStatus(
      req.user.tenantId,
      id,
      body.status,
      req.user?.id,
    );
  }

  @Put(':id/override-price')
  @UseGuards(TenantAdminGuard)
  async overridePrice(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { finalTotal: number; reason: string },
  ) {
    if (!body.finalTotal || body.finalTotal <= 0) {
      throw new BadRequestException('finalTotal must be a positive number');
    }
    if (!body.reason || body.reason.trim().length === 0) {
      throw new BadRequestException('reason is required');
    }
    return this.ordersService.overridePrice(
      req.user.tenantId,
      id,
      body.finalTotal,
      req.user.id,
      body.reason.trim(),
    );
  }
}
