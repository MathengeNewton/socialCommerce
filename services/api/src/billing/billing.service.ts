import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TariffsService } from './tariffs.service';

function toDecimal(n: number) {
  // Prisma Decimal accepts string/number, but keep consistent rounding for money.
  return Number(n.toFixed(2));
}

@Injectable()
export class BillingService {
  constructor(
    private prisma: PrismaService,
    private tariffsService: TariffsService,
  ) {}

  async listInvoices(tenantId: string, clientId: string) {
    return this.prisma.invoice.findMany({
      where: { tenantId, clientId },
      include: { lines: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getInvoice(tenantId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: { lines: true },
    });
    if (!invoice) throw new NotFoundException(`Invoice with id "${invoiceId}" not found`);
    return invoice;
  }

  async markPaid(tenantId: string, invoiceId: string) {
    await this.getInvoice(tenantId, invoiceId);
    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: 'paid', paidAt: new Date() },
      include: { lines: true },
    });
  }

  async recordUsageEvent(
    tenantId: string,
    clientId: string,
    data: { type: string; occurredAt?: Date; quantity?: number; unitPrice: number; metadataJson?: any },
  ) {
    const occurredAt = data.occurredAt ?? new Date();
    const quantity = data.quantity ?? 1;
    const unitPrice = toDecimal(data.unitPrice);
    const amount = toDecimal(unitPrice * quantity);

    return this.prisma.usageEvent.create({
      data: {
        tenantId,
        clientId,
        type: data.type,
        occurredAt,
        quantity,
        unitPrice,
        amount,
        metadataJson: data.metadataJson ?? {},
      },
    });
  }

  async generateInvoice(
    tenantId: string,
    clientId: string,
    periodStart: Date,
    periodEnd: Date,
  ) {
    if (!(periodStart instanceof Date) || !(periodEnd instanceof Date)) {
      throw new BadRequestException('Invalid period');
    }
    if (periodEnd <= periodStart) throw new BadRequestException('periodEnd must be after periodStart');

    // Ensure client belongs to tenant
    const client = await this.prisma.client.findFirst({
      where: { tenantId, id: clientId },
      select: { id: true },
    });
    if (!client) throw new NotFoundException(`Client with id "${clientId}" not found`);

    // Load active tariff (required for now)
    const activeTariff = await this.tariffsService.getActiveTariff(tenantId, clientId, periodEnd);
    if (!activeTariff) throw new BadRequestException('Client has no active tariff for this period');

    // Find uninvoiced usage events in period
    const events = await this.prisma.usageEvent.findMany({
      where: {
        tenantId,
        clientId,
        invoiceId: null,
        occurredAt: { gte: periodStart, lt: periodEnd },
      },
      orderBy: { occurredAt: 'asc' },
    });

    if (events.length === 0) {
      throw new BadRequestException('No usage events to invoice for this period');
    }

    const subtotal = toDecimal(events.reduce((sum, e) => sum + Number(e.amount), 0));
    const tax = toDecimal(0);
    const total = toDecimal(subtotal + tax);

    // Create invoice + lines, attach events (transaction)
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          tenantId,
          clientId,
          periodStart,
          periodEnd,
          status: 'issued',
          subtotal,
          tax,
          total,
          issuedAt: new Date(),
          lines: {
            create: events.map((e) => ({
              description: `${e.type}`,
              quantity: e.quantity,
              unitPrice: e.unitPrice,
              amount: e.amount,
              metadataJson: e.metadataJson,
            })),
          },
        },
        include: { lines: true },
      });

      await tx.usageEvent.updateMany({
        where: { id: { in: events.map((e) => e.id) } },
        data: { invoiceId: invoice.id },
      });

      return invoice;
    });
  }
}

