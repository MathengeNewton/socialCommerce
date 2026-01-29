import { BadRequestException, Controller, Get, Post, Param, Delete, Body, UseGuards, Request, Query } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../tenant/tenant.guard';
import { connectIntegrationSchema } from '@social-commerce/shared';

@Controller('integrations')
@UseGuards(JwtAuthGuard, TenantGuard)
export class IntegrationsController {
  constructor(private integrationsService: IntegrationsService) {}

  @Post(':provider/connect')
  async connect(
    @Request() req,
    @Param('provider') provider: string,
    @Body() body: { code: string; redirectUri: string; clientId?: string },
  ) {
    const clientId = body.clientId || req.query.clientId;
    if (!clientId) {
      throw new BadRequestException('clientId is required');
    }
    const validated = connectIntegrationSchema.parse({ provider, ...body });
    return this.integrationsService.connect(
      req.user.tenantId,
      clientId,
      provider,
      validated.code,
      validated.redirectUri,
      req.user?.id,
    );
  }

  @Get()
  async findAll(@Request() req, @Query('clientId') clientId?: string) {
    return this.integrationsService.findAll(req.user.tenantId, clientId);
  }

  @Delete(':id')
  async disconnect(@Request() req, @Param('id') id: string) {
    return this.integrationsService.disconnect(req.user.tenantId, id, req.user?.id);
  }
}
