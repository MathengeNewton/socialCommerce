import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrationsService } from '../integrations/integrations.service';

@Injectable()
export class DestinationsService {
  constructor(
    private prisma: PrismaService,
    private integrationsService: IntegrationsService,
  ) {}

  async findAll(tenantId: string, clientId?: string) {
    const where: any = {
      integration: {
        tenantId,
      },
    };

    if (clientId) {
      where.integration.clientId = clientId;
    }

    return this.prisma.destination.findMany({
      where,
      include: {
        integration: {
          select: {
            id: true,
            provider: true,
            tenantId: true,
            clientId: true,
          },
        },
      },
    });
  }

  async refresh(tenantId: string, integrationId: string) {
    const integration = await this.prisma.integration.findFirst({
      where: {
        id: integrationId,
        tenantId,
      },
    });

    if (!integration) {
      throw new Error('Integration not found');
    }

    const decryptedToken = this.integrationsService.decryptToken(integration.accessToken);
    return this.integrationsService.refreshDestinations(
      integrationId,
      integration.provider,
      decryptedToken,
    );
  }
}
