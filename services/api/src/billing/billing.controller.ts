import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../tenant/tenant.guard';
import { TenantAdminGuard } from '../auth/guards/tenant-admin.guard';
import { BillingService } from './billing.service';
import { TariffsService } from './tariffs.service';

@Controller()
@UseGuards(JwtAuthGuard, TenantGuard, TenantAdminGuard)
export class BillingController {
  constructor(
    private billingService: BillingService,
    private tariffsService: TariffsService,
  ) {}

  // Tariffs
  @Get('tariffs')
  async listTariffs(@Request() req) {
    return this.tariffsService.listTariffs(req.user.tenantId);
  }

  @Post('tariffs')
  async createTariff(
    @Request() req,
    @Body() body: { name: string; currency?: string; minPostsPerWeek?: number; rulesJson?: any },
  ) {
    return this.tariffsService.createTariff(req.user.tenantId, body);
  }

  @Post('clients/:clientId/tariff')
  async assignTariff(
    @Request() req,
    @Param('clientId') clientId: string,
    @Body() body: { tariffId: string; activeFrom?: string; activeTo?: string | null; overridesJson?: any },
  ) {
    return this.tariffsService.assignTariffToClient(req.user.tenantId, clientId, body);
  }

  // Billing
  @Get('billing/clients/:clientId/invoices')
  async listInvoices(@Request() req, @Param('clientId') clientId: string) {
    return this.billingService.listInvoices(req.user.tenantId, clientId);
  }

  @Post('billing/clients/:clientId/invoices/generate')
  async generateInvoice(
    @Request() req,
    @Param('clientId') clientId: string,
    @Query('periodStart') periodStart: string,
    @Query('periodEnd') periodEnd: string,
  ) {
    return this.billingService.generateInvoice(
      req.user.tenantId,
      clientId,
      new Date(periodStart),
      new Date(periodEnd),
    );
  }

  @Get('billing/invoices/:id')
  async getInvoice(@Request() req, @Param('id') id: string) {
    return this.billingService.getInvoice(req.user.tenantId, id);
  }

  @Post('billing/invoices/:id/mark-paid')
  async markPaid(@Request() req, @Param('id') id: string) {
    return this.billingService.markPaid(req.user.tenantId, id);
  }
}

