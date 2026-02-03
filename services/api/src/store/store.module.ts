import { Module } from '@nestjs/common';
import { StoreController } from './store.controller';
import { StoreService } from './store.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CartModule } from '../cart/cart.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [PrismaModule, CartModule, OrdersModule],
  controllers: [StoreController],
  providers: [StoreService],
})
export class StoreModule {}
