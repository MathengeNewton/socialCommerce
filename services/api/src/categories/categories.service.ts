import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.productCategory.findMany({
      where: { tenantId },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });
  }

  async create(tenantId: string, data: { name: string; slug?: string; order?: number }) {
    const slug =
      data.slug?.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') ||
      data.name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') ||
      'category';

    const existing = await this.prisma.productCategory.findFirst({
      where: { tenantId, slug },
    });
    if (existing) {
      throw new BadRequestException(`Category with slug "${slug}" already exists`);
    }

    return this.prisma.productCategory.create({
      data: {
        tenantId,
        name: data.name.trim(),
        slug,
        order: data.order ?? 0,
      },
    });
  }

  async update(tenantId: string, id: string, data: { name?: string; slug?: string; order?: number }) {
    const existing = await this.prisma.productCategory.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundException(`Category with id "${id}" not found`);
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.order !== undefined) updateData.order = data.order;
    if (data.slug !== undefined) {
      const slug = data.slug.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || existing.slug;
      const slugExists = await this.prisma.productCategory.findFirst({
        where: { tenantId, slug, id: { not: id } },
      });
      if (slugExists) throw new BadRequestException(`Category with slug "${slug}" already exists`);
      updateData.slug = slug;
    }

    return this.prisma.productCategory.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(tenantId: string, id: string) {
    const existing = await this.prisma.productCategory.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundException(`Category with id "${id}" not found`);
    }

    await this.prisma.product.updateMany({
      where: { categoryId: id },
      data: { categoryId: null },
    });

    return this.prisma.productCategory.delete({
      where: { id },
    });
  }
}
