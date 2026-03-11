import { Module } from '@nestjs/common';
import { StoreController } from './store.controller';
import { StoreService } from './store.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CartModule } from '../cart/cart.module';
import { OrdersModule } from '../orders/orders.module';
import { ServicePackagesModule } from '../service-packages/service-packages.module';
import { StorefrontSettingsModule } from '../storefront-settings/storefront-settings.module';

@Module({
  imports: [PrismaModule, CartModule, OrdersModule, ServicePackagesModule, StorefrontSettingsModule],
  controllers: [StoreController],
  providers: [StoreService],
})
export class StoreModule {}
