import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../tenant/tenant.guard';
import { MessagesService } from './messages.service';

@Controller('messages')
@UseGuards(JwtAuthGuard, TenantGuard)
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @Get()
  async findAll(
    @Request() req: { user: { tenantId: string } },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.messagesService.findAll(req.user.tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req: { user: { tenantId: string } }) {
    const count = await this.messagesService.getUnreadCount(req.user.tenantId);
    return { count };
  }

  @Patch(':id/read')
  async markAsRead(
    @Request() req: { user: { tenantId: string } },
    @Param('id') id: string,
  ) {
    const msg = await this.messagesService.markAsRead(req.user.tenantId, id);
    if (!msg) return { ok: false };
    return {
      ok: true,
      message: {
        id: msg.id,
        name: msg.name,
        phone: msg.phone,
        message: msg.message,
        readAt: msg.readAt?.toISOString() ?? null,
        createdAt: msg.createdAt.toISOString(),
      },
    };
  }
}
