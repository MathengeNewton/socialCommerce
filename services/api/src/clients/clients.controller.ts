import { Body, Controller, Delete, Get, Param, Post, Put, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../tenant/tenant.guard';
import { TenantAdminGuard } from '../auth/guards/tenant-admin.guard';
import { ClientsService } from './clients.service';

@Controller('clients')
@UseGuards(JwtAuthGuard, TenantGuard, TenantAdminGuard)
export class ClientsController {
  constructor(private clientsService: ClientsService) {}

  @Get()
  async findAll(@Request() req) {
    return this.clientsService.findAll(req.user.tenantId);
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    return this.clientsService.findOne(req.user.tenantId, id);
  }

  @Post()
  async create(@Request() req, @Body() body: { name: string }) {
    return this.clientsService.create(req.user.tenantId, body);
  }

  @Put(':id')
  async update(@Request() req, @Param('id') id: string, @Body() body: { name?: string }) {
    return this.clientsService.update(req.user.tenantId, id, body);
  }

  @Delete(':id')
  async remove(@Request() req, @Param('id') id: string) {
    return this.clientsService.remove(req.user.tenantId, id);
  }

  @Get(':id/social/summary')
  async socialSummary(@Request() req, @Param('id') id: string) {
    return this.clientsService.socialSummary(req.user.tenantId, id);
  }
}

