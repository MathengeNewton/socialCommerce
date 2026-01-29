import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return null;
    }

    const { passwordHash, ...result } = user;
    return result;
  }

  async login(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });

    // Generate refresh token
    const refreshToken = randomBytes(32).toString('hex');
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshTokenHash,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  async refreshToken(token: string) {
    // Find refresh token
    const refreshTokens = await this.prisma.refreshToken.findMany({
      where: {
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: true,
      },
    });

    let validToken = null;
    for (const rt of refreshTokens) {
      const isValid = await bcrypt.compare(token, rt.tokenHash);
      if (isValid) {
        validToken = rt;
        break;
      }
    }

    if (!validToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if expired
    if (validToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Delete old refresh token (rotation)
    await this.prisma.refreshToken.deleteMany({
      where: { userId: validToken.userId },
    });

    // Generate new tokens
    const payload = {
      sub: validToken.user.id,
      email: validToken.user.email,
      tenantId: validToken.user.tenantId,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });

    const newRefreshToken = randomBytes(32).toString('hex');
    const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        userId: validToken.user.id,
        tokenHash: newRefreshTokenHash,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(userId: string) {
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }
}
