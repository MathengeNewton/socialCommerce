import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    validateUser: jest.fn(),
    login: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: LocalAuthGuard,
          useValue: { canActivate: () => true },
        },
        {
          provide: JwtAuthGuard,
          useValue: { canActivate: () => true },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/login', () => {
    it('should return tokens on successful login', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      mockAuthService.validateUser.mockResolvedValue({ id: '1', email: loginDto.email, tenantId: 't1' });
      mockAuthService.login.mockResolvedValue(mockTokens);

      const req = { body: loginDto };
      const result = await controller.login(req as any);

      expect(result).toEqual(mockTokens);
      expect(mockAuthService.validateUser).toHaveBeenCalledWith(loginDto.email, loginDto.password);
      expect(mockAuthService.login).toHaveBeenCalledWith(
        expect.objectContaining({ email: loginDto.email }),
      );
    });

    it('should throw UnauthorizedException on invalid credentials', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      mockAuthService.validateUser.mockResolvedValue(null);

      const req = { body: loginDto };
      await expect(controller.login(req as any)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should return new tokens on valid refresh token', async () => {
      const refreshDto = {
        refreshToken: 'valid-refresh-token',
      };

      const mockTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      mockAuthService.refreshToken.mockResolvedValue(mockTokens);

      const result = await controller.refresh(refreshDto);

      expect(result).toEqual(mockTokens);
      expect(mockAuthService.refreshToken).toHaveBeenCalledWith(refreshDto.refreshToken);
    });

    it('should throw UnauthorizedException on invalid refresh token', async () => {
      const refreshDto = {
        refreshToken: 'invalid-token',
      };

      mockAuthService.refreshToken.mockRejectedValue(
        new UnauthorizedException('Invalid refresh token'),
      );

      await expect(controller.refresh(refreshDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout user successfully', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        tenantId: 'tenant-1',
      };

      mockAuthService.logout.mockResolvedValue(undefined);

      await controller.logout({ user: mockUser } as any);

      expect(mockAuthService.logout).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('GET /me', () => {
    it('should return current user', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        tenantId: 'tenant-1',
      };

      const result = await controller.getMe({ user: mockUser } as any);

      expect(result).toEqual(mockUser);
    });
  });
});
