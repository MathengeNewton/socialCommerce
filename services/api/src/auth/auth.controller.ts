import {
  Controller,
  Post,
  Body,
  Get,
  Patch,
  UseGuards,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { loginSchema, refreshTokenSchema } from '@social-commerce/shared';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req) {
    const validated = loginSchema.parse(req.body);
    const user = await this.authService.validateUser(validated.email, validated.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(user);
  }

  @Post('refresh')
  async refresh(@Body() body: { refreshToken: string }) {
    const validated = refreshTokenSchema.parse(body);
    return this.authService.refreshToken(validated.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Request() req) {
    await this.authService.logout(req.user.id);
    return { message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Request() req) {
    const profile = await this.authService.getProfile(req.user.id);
    if (!profile) throw new UnauthorizedException('User not found');
    return profile;
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateMe(
    @Request() req,
    @Body()
    body: {
      name?: string;
      currentPassword?: string;
      newPassword?: string;
    },
  ) {
    return this.authService.updateMe(req.user.id, body);
  }
}
