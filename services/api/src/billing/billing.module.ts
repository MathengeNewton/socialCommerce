import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { TariffsService } from './tariffs.service';

@Module({
  imports: [PrismaModule],
  controllers: [BillingController],
  providers: [BillingService, TariffsService],
  exports: [BillingService, TariffsService],
})
export class BillingModule {}

