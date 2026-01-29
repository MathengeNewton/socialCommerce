import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { PrismaModule } from '../prisma/prisma.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [PrismaModule, InventoryModule],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
