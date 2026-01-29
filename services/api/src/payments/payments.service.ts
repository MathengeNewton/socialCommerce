import { Injectable, NotFoundException } from '@nestjs/common';
import { OrdersService } from '../orders/orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';

@Injectable()
export class PaymentsService {
  constructor(
    private ordersService: OrdersService,
    private prisma: PrismaService,
  ) {}

  async createPayment(orderId: string, tenantId: string) {
    // Get order to determine payment amount
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        tenantId,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with id "${orderId}" not found`);
    }

    // Use finalTotal if set (staff override), otherwise use quotedTotal, fallback to total
    const amount = order.finalTotal
      ? Number(order.finalTotal)
      : order.quotedTotal
        ? Number(order.quotedTotal)
        : Number(order.total);

    // Payment provider integration would go here
    // For now, return a mock payment request
    return {
      paymentId: `PAY-${Date.now()}`,
      orderId,
      amount,
      status: 'pending',
      paymentUrl: `/payments/${orderId}/pay`,
    };
  }

  async processWebhook(payload: any, signature: string) {
    // Verify webhook signature
    // For now, mock verification
    const isValid = this.verifyWebhookSignature(payload, signature);

    if (!isValid) {
      throw new Error('Invalid webhook signature');
    }

    // Process payment webhook
    const { orderId, status, paymentId } = payload;

    if (status === 'paid' || status === 'completed') {
      // Update order status and generate receipt
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          receipt: true,
        },
      });

      if (order && order.status === 'pending') {
        const finalAmount = order.finalTotal
          ? Number(order.finalTotal)
          : order.quotedTotal
            ? Number(order.quotedTotal)
            : Number(order.total);

        // Generate receipt number
        const receiptNumber = `RCP-${randomBytes(4).toString('hex').toUpperCase()}`;

        // Update order and create receipt in a transaction
        await this.prisma.$transaction(async (tx) => {
          await tx.order.update({
            where: { id: orderId },
            data: { status: 'processing' },
          });

          // Only create receipt if one doesn't exist
          if (!order.receipt) {
            await tx.receipt.create({
              data: {
                tenantId: order.tenantId,
                clientId: order.clientId,
                orderId: order.id,
                receiptNumber,
                totalPaid: finalAmount,
                paymentMethod: payload.paymentMethod || 'card',
                metadataJson: {
                  paymentId,
                  processedAt: new Date().toISOString(),
                },
              },
            });
          }
        });
      }
    }

    return { success: true };
  }

  private verifyWebhookSignature(payload: any, signature: string): boolean {
    // Implement actual signature verification based on payment provider
    // For now, return true for mock
    return true;
  }
}
