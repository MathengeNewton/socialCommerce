import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        passwordHash,
        name: 'Test User',
        tenantId: 'tenant-1',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.validateUser('test@example.com', 'password123');

      expect(result).toBeDefined();
      expect(result.email).toBe('test@example.com');
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should return null when user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.validateUser('nonexistent@example.com', 'password123');

      expect(result).toBeNull();
    });

    it('should return null when password is incorrect', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        passwordHash,
        name: 'Test User',
        tenantId: 'tenant-1',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.validateUser('test@example.com', 'wrongpassword');

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return access token and refresh token on successful login', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        tenantId: 'tenant-1',
      };

      mockJwtService.sign.mockReturnValue('access-token');
      mockPrismaService.refreshToken.create.mockResolvedValue({
        id: 'refresh-1',
        tokenHash: 'hashed-token',
      });

      const result = await service.login(mockUser as any);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.accessToken).toBe('access-token');
      expect(mockJwtService.sign).toHaveBeenCalled();
      expect(mockPrismaService.refreshToken.create).toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    it('should return new tokens when refresh token is valid', async () => {
      const refreshTokenHash = await bcrypt.hash('refresh-token', 10);
      const mockRefreshToken = {
        id: 'refresh-1',
        userId: 'user-1',
        tokenHash: refreshTokenHash,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days
        user: {
          id: 'user-1',
          email: 'test@example.com',
          tenantId: 'tenant-1',
        },
      };

      mockPrismaService.refreshToken.findMany.mockResolvedValue([mockRefreshToken]);
      mockJwtService.sign.mockReturnValue('new-access-token');
      mockPrismaService.refreshToken.deleteMany.mockResolvedValue({ count: 1 });
      mockPrismaService.refreshToken.create.mockResolvedValue({
        id: 'new-refresh-1',
        tokenHash: 'new-hashed-token',
      });

      const result = await service.refreshToken('refresh-token');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(mockPrismaService.refreshToken.deleteMany).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when refresh token is invalid', async () => {
      mockPrismaService.refreshToken.findMany.mockResolvedValue([]);

      await expect(service.refreshToken('invalid-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when refresh token is expired', async () => {
      const refreshTokenHash = await bcrypt.hash('refresh-token', 10);
      const mockRefreshToken = {
        id: 'refresh-1',
        userId: 'user-1',
        tokenHash: refreshTokenHash,
        expiresAt: new Date(Date.now() - 1000), // Expired
        user: {
          id: 'user-1',
          email: 'test@example.com',
          tenantId: 'tenant-1',
        },
      };

      mockPrismaService.refreshToken.findMany.mockResolvedValue([mockRefreshToken]);

      await expect(service.refreshToken('refresh-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should delete refresh token', async () => {
      mockPrismaService.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

      await service.logout('user-1');

      expect(mockPrismaService.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });
  });
});
