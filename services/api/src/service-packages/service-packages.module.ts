import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ServicePackagesController } from './service-packages.controller';
import { ServicePackagesService } from './service-packages.service';

@Module({
  imports: [PrismaModule],
  controllers: [ServicePackagesController],
  providers: [ServicePackagesService],
  exports: [ServicePackagesService],
})
export class ServicePackagesModule {}
