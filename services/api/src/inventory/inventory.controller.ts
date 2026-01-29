import { Controller, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../tenant/tenant.guard';

@Controller('inventory')
@UseGuards(JwtAuthGuard, TenantGuard)
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Post(':variantId/adjust')
  async adjustStock(@Param('variantId') variantId: string, @Body() body: { adjustment: number }) {
    return this.inventoryService.adjustStock(variantId, body.adjustment);
  }

  @Post(':variantId/set')
  async setStock(@Param('variantId') variantId: string, @Body() body: { stock: number }) {
    return this.inventoryService.setStock(variantId, body.stock);
  }
}
