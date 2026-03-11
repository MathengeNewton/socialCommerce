import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type ServicePackagePayload = {
  name: string;
  slug?: string;
  shortDescription: string;
  priceLabel: string;
  cadence?: string;
  features: string[];
  ctaLabel?: string;
  isActive?: boolean;
  displayOrder?: number;
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '') || 'package';
}

function normalizeFeatures(features: unknown): string[] {
  if (!Array.isArray(features)) return [];
  return features
    .map((feature) => String(feature ?? '').trim())
    .filter(Boolean)
    .slice(0, 12);
}

function toPublicPackage(record: {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  priceLabel: string;
  cadence: string | null;
  featuresJson: unknown;
  ctaLabel: string;
  isActive: boolean;
  displayOrder: number;
}) {
  return {
    id: record.id,
    name: record.name,
    slug: record.slug,
    shortDescription: record.shortDescription,
    priceLabel: record.priceLabel,
    cadence: record.cadence,
    features: normalizeFeatures(record.featuresJson),
    ctaLabel: record.ctaLabel,
    isActive: record.isActive,
    displayOrder: record.displayOrder,
  };
}

@Injectable()
export class ServicePackagesService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    const records = await this.prisma.servicePackage.findMany({
      where: { tenantId },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return records.map(toPublicPackage);
  }

  async findActive(tenantId: string) {
    const records = await this.prisma.servicePackage.findMany({
      where: { tenantId, isActive: true },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return records.map(toPublicPackage);
  }

  async create(tenantId: string, payload: ServicePackagePayload) {
    const slug = payload.slug ? slugify(payload.slug) : slugify(payload.name);
    const existing = await this.prisma.servicePackage.findFirst({
      where: { tenantId, slug },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException(`Package with slug "${slug}" already exists`);
    }

    const created = await this.prisma.servicePackage.create({
      data: {
        tenantId,
        name: payload.name.trim(),
        slug,
        shortDescription: payload.shortDescription.trim(),
        priceLabel: payload.priceLabel.trim(),
        cadence: payload.cadence?.trim() || null,
        featuresJson: normalizeFeatures(payload.features),
        ctaLabel: payload.ctaLabel?.trim() || 'Book consultation',
        isActive: payload.isActive ?? true,
        displayOrder: payload.displayOrder ?? 0,
      },
    });

    return toPublicPackage(created);
  }

  async update(tenantId: string, id: string, payload: Partial<ServicePackagePayload>) {
    const existing = await this.prisma.servicePackage.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundException(`Package with id "${id}" not found`);
    }

    const updateData: Record<string, unknown> = {};
    if (payload.name !== undefined) updateData.name = payload.name.trim();
    if (payload.shortDescription !== undefined) updateData.shortDescription = payload.shortDescription.trim();
    if (payload.priceLabel !== undefined) updateData.priceLabel = payload.priceLabel.trim();
    if (payload.cadence !== undefined) updateData.cadence = payload.cadence.trim() || null;
    if (payload.features !== undefined) updateData.featuresJson = normalizeFeatures(payload.features);
    if (payload.ctaLabel !== undefined) updateData.ctaLabel = payload.ctaLabel.trim() || 'Book consultation';
    if (payload.isActive !== undefined) updateData.isActive = payload.isActive;
    if (payload.displayOrder !== undefined) updateData.displayOrder = payload.displayOrder;
    if (payload.slug !== undefined) {
      const slug = slugify(payload.slug);
      const slugExists = await this.prisma.servicePackage.findFirst({
        where: { tenantId, slug, id: { not: id } },
        select: { id: true },
      });
      if (slugExists) {
        throw new BadRequestException(`Package with slug "${slug}" already exists`);
      }
      updateData.slug = slug;
    }

    const updated = await this.prisma.servicePackage.update({
      where: { id },
      data: updateData,
    });

    return toPublicPackage(updated);
  }

  async remove(tenantId: string, id: string) {
    const existing = await this.prisma.servicePackage.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException(`Package with id "${id}" not found`);
    }

    return this.prisma.servicePackage.delete({
      where: { id },
    });
  }
}
