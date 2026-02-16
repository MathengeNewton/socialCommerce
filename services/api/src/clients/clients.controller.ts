import { Body, Controller, Delete, Get, Param, Post, Put, Query, Request, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../tenant/tenant.guard';
import { ClientsService } from './clients.service';
import { parseCsvToRows } from '../common/csv.util';

@Controller('clients')
@UseGuards(JwtAuthGuard, TenantGuard)
export class ClientsController {
  constructor(private clientsService: ClientsService) {}

  @Get()
  async findAll(@Request() req, @Query('includeInactive') includeInactive?: string) {
    return this.clientsService.findAll(req.user.tenantId, includeInactive !== 'false');
  }

  @Post('bulk')
  async bulkImport(@Request() req, @Body() body: { rows: Array<{ name: string }> }) {
    const rows = Array.isArray(body?.rows) ? body.rows : [];
    return this.clientsService.bulkImport(req.user.tenantId, rows);
  }

  @Post('bulk/upload')
  @UseInterceptors(FileInterceptor('file'))
  async bulkUpload(@Request() req, @UploadedFile() file: Express.Multer.File) {
    if (!file?.buffer) throw new BadRequestException('File is required');
    const { rows } = parseCsvToRows(file.buffer);
    const payload = rows.map((r) => ({ name: (r.name ?? '').trim() }));
    return this.clientsService.bulkImport(req.user.tenantId, payload);
  }

  @Get(':id/detail')
  async getDetail(@Request() req, @Param('id') id: string) {
    return this.clientsService.getDetail(req.user.tenantId, id);
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    return this.clientsService.findOne(req.user.tenantId, id);
  }

  @Put(':id/active')
  async setActive(@Request() req, @Param('id') id: string, @Body() body: { active: boolean }) {
    return this.clientsService.setActive(req.user.tenantId, id, body.active);
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

