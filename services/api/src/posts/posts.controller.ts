import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  UseGuards,
  Request,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../tenant/tenant.guard';
import { createPostSchema, updatePostSchema } from '@social-commerce/shared';

@Controller('posts')
@UseGuards(JwtAuthGuard, TenantGuard)
export class PostsController {
  constructor(private postsService: PostsService) {}

  @Post()
  async create(@Request() req, @Body() body: any) {
    if (!body.clientId) {
      throw new BadRequestException('clientId is required');
    }
    const validated = createPostSchema.parse(body);
    return this.postsService.create(req.user.tenantId, body.clientId, validated);
  }

  @Get()
  async findAll(@Request() req, @Query('clientId') clientId?: string) {
    return this.postsService.findAll(req.user.tenantId, clientId);
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    return this.postsService.findOne(req.user.tenantId, id);
  }

  @Put(':id')
  async update(@Request() req, @Param('id') id: string, @Body() body: any) {
    const validated = updatePostSchema.parse(body);
    return this.postsService.update(req.user.tenantId, id, validated);
  }

  @Post(':id/publish')
  async publish(@Request() req, @Param('id') id: string) {
    return this.postsService.publish(req.user.tenantId, id, req.user?.id);
  }

  @Post(':id/schedule')
  async schedule(@Request() req, @Param('id') id: string, @Body() body: { scheduledAt: string }) {
    return this.postsService.schedule(req.user.tenantId, id, body.scheduledAt, req.user?.id);
  }

  @Post(':id/cancel')
  async cancel(@Request() req, @Param('id') id: string) {
    return this.postsService.cancel(req.user.tenantId, id, req.user?.id);
  }
}
