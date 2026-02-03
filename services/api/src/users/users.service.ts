import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { createUserSchema, updateUserSchema } from '@social-commerce/shared';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        memberships: {
          select: {
            clientId: true,
            client: { select: { name: true } },
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { tenantId, id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        memberships: {
          select: {
            clientId: true,
            client: { select: { name: true } },
            role: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundException(`User with id "${id}" not found`);
    return user;
  }

  async create(
    tenantId: string,
    data: { email: string; password: string; name: string; role: string },
  ) {
    const validated = createUserSchema.parse(data);

    const existing = await this.prisma.user.findUnique({
      where: { email: validated.email },
    });
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const passwordHash = await bcrypt.hash(validated.password, 10);

    return this.prisma.user.create({
      data: {
        tenantId,
        email: validated.email,
        name: validated.name,
        passwordHash,
        role: validated.role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async update(
    tenantId: string,
    id: string,
    data: { name?: string; role?: string; password?: string },
  ) {
    await this.findOne(tenantId, id);

    const validated = updateUserSchema.parse(data);

    const updateData: { name?: string; role?: string; passwordHash?: string } = {};

    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.role !== undefined) updateData.role = validated.role;
    if (validated.password !== undefined) {
      updateData.passwordHash = await bcrypt.hash(validated.password, 10);
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No valid fields to update');
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);

    await this.prisma.refreshToken.deleteMany({ where: { userId: id } });
    await this.prisma.membership.deleteMany({ where: { userId: id } });
    await this.prisma.user.delete({ where: { id } });

    return { success: true };
  }
}
