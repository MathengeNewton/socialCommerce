import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TariffsService {
  constructor(private prisma: PrismaService) {}

  async listTariffs(tenantId: string) {
    return this.prisma.tariff.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createTariff(
    tenantId: string,
    data: { name: string; currency?: string; minPostsPerWeek?: number; rulesJson?: any },
  ) {
    const name = (data.name || '').trim();
    if (!name) throw new BadRequestException('Tariff name is required');

    const minPostsPerWeek = data.minPostsPerWeek ?? 0;
    if (minPostsPerWeek < 0) throw new BadRequestException('minPostsPerWeek must be >= 0');

    return this.prisma.tariff.create({
      data: {
        tenantId,
        name,
        currency: data.currency || 'KES',
        minPostsPerWeek,
        rulesJson: data.rulesJson ?? {},
      },
    });
  }

  async assignTariffToClient(
    tenantId: string,
    clientId: string,
    data: { tariffId: string; activeFrom?: string; activeTo?: string | null; overridesJson?: any },
  ) {
    // Ensure client belongs to tenant
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, tenantId },
      select: { id: true },
    });
    if (!client) throw new NotFoundException(`Client with id "${clientId}" not found`);

    const tariff = await this.prisma.tariff.findFirst({
      where: { id: data.tariffId, tenantId },
      select: { id: true },
    });
    if (!tariff) throw new NotFoundException(`Tariff with id "${data.tariffId}" not found`);

    const activeFrom = data.activeFrom ? new Date(data.activeFrom) : new Date();
    const activeTo = data.activeTo ? new Date(data.activeTo) : null;
    if (activeTo && activeTo <= activeFrom) {
      throw new BadRequestException('activeTo must be after activeFrom');
    }

    return this.prisma.clientTariff.create({
      data: {
        clientId,
        tariffId: data.tariffId,
        activeFrom,
        activeTo,
        overridesJson: data.overridesJson ?? undefined,
      },
    });
  }

  async getActiveTariff(tenantId: string, clientId: string, at: Date) {
    return this.prisma.clientTariff.findFirst({
      where: {
        clientId,
        client: { tenantId },
        activeFrom: { lte: at },
        OR: [{ activeTo: null }, { activeTo: { gt: at } }],
      },
      orderBy: { activeFrom: 'desc' },
      include: { tariff: true },
    });
  }
}

