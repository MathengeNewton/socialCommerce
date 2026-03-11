import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function toPublicSettings(
  record:
    | {
        id: string;
        heroImageMediaId: string | null;
        heroImage?: { id: string; url: string } | null;
      }
    | null
) {
  if (!record) {
    return {
      heroImageMediaId: null,
      heroImage: null,
    };
  }

  return {
    heroImageMediaId: record.heroImageMediaId,
    heroImage: record.heroImage ? { id: record.heroImage.id, url: record.heroImage.url } : null,
  };
}

@Injectable()
export class StorefrontSettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettings(tenantId: string) {
    const record = await this.prisma.storefrontSettings.findUnique({
      where: { tenantId },
      include: {
        heroImage: {
          select: { id: true, url: true },
        },
      },
    });

    return toPublicSettings(record);
  }

  async updateSettings(tenantId: string, data: { heroImageMediaId?: string | null }) {
    if (data.heroImageMediaId) {
      const media = await this.prisma.media.findFirst({
        where: {
          id: data.heroImageMediaId,
          tenantId,
        },
        select: { id: true },
      });
      if (!media) {
        throw new BadRequestException('Hero image media not found');
      }
    }

    const record = await this.prisma.storefrontSettings.upsert({
      where: { tenantId },
      create: {
        tenantId,
        heroImageMediaId: data.heroImageMediaId ?? null,
      },
      update: {
        ...(data.heroImageMediaId !== undefined ? { heroImageMediaId: data.heroImageMediaId } : {}),
      },
      include: {
        heroImage: {
          select: { id: true, url: true },
        },
      },
    });

    return toPublicSettings(record);
  }
}
