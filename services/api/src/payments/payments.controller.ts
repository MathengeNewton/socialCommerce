import { Controller, Post, Body, Headers, UseGuards, Request } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../tenant/tenant.guard';

@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('create')
  @UseGuards(JwtAuthGuard, TenantGuard)
  async createPayment(@Request() req, @Body() body: { orderId: string }) {
    return this.paymentsService.createPayment(body.orderId, req.user.tenantId);
  }

  @Post('webhook')
  async webhook(@Body() body: any, @Headers('x-signature') signature: string) {
    return this.paymentsService.processWebhook(body, signature);
  }
}
