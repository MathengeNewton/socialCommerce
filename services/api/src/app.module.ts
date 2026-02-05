import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { MediaModule } from './media/media.module';
import { ProductsModule } from './products/products.module';
import { InventoryModule } from './inventory/inventory.module';
import { StoreModule } from './store/store.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { DestinationsModule } from './destinations/destinations.module';
import { PostsModule } from './posts/posts.module';
import { PublishingModule } from './publishing/publishing.module';
import { TenantMiddleware } from './tenant/tenant.middleware';
import { BullModule } from '@nestjs/bullmq';
import { ClientsModule } from './clients/clients.module';
import { BillingModule } from './billing/billing.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { UsersModule } from './users/users.module';
import { AuditModule } from './audit/audit.module';
import { CategoriesModule } from './categories/categories.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'redis',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    PrismaModule,
    AuditModule,
    AuthModule,
    HealthModule,
    MediaModule,
    ProductsModule,
    InventoryModule,
    StoreModule,
    OrdersModule,
    PaymentsModule,
    IntegrationsModule,
    DestinationsModule,
    ClientsModule,
    BillingModule,
    SuppliersModule,
    PostsModule,
    PublishingModule,
    DashboardModule,
    UsersModule,
    CategoriesModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).exclude('health', 'store', 'payments/webhook', 'media/public').forRoutes('*');
  }
}
