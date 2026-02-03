import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../tenant/tenant.guard';
import { TenantAdminGuard } from '../auth/guards/tenant-admin.guard';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, TenantGuard, TenantAdminGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  async findAll(@Request() req: { user: { tenantId: string } }) {
    return this.usersService.findAll(req.user.tenantId);
  }

  @Get(':id')
  async findOne(@Request() req: { user: { tenantId: string } }, @Param('id') id: string) {
    return this.usersService.findOne(req.user.tenantId, id);
  }

  @Post()
  async create(
    @Request() req: { user: { tenantId: string } },
    @Body() body: { email: string; password: string; name: string; role: string },
  ) {
    return this.usersService.create(req.user.tenantId, body);
  }

  @Put(':id')
  async update(
    @Request() req: { user: { tenantId: string } },
    @Param('id') id: string,
    @Body() body: { name?: string; role?: string; password?: string },
  ) {
    return this.usersService.update(req.user.tenantId, id, body);
  }

  @Delete(':id')
  async remove(@Request() req: { user: { tenantId: string } }, @Param('id') id: string) {
    return this.usersService.remove(req.user.tenantId, id);
  }
}
