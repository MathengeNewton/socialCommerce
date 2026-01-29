import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../tenant/tenant.guard';
import { mediaUploadSchema, mediaConfirmSchema } from '@social-commerce/shared';

@Controller('media')
@UseGuards(JwtAuthGuard, TenantGuard)
export class MediaController {
  constructor(private mediaService: MediaService) {}

  /** Direct upload (multipart): file goes to Cloudinary or S3 per MEDIA_STORAGE. Returns mediaId + url for preview. */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Request() req: { user: { tenantId: string }; body: { clientId?: string } },
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('No file uploaded');
    }
    const clientId = req.body?.clientId || null;
    return this.mediaService.uploadFile(
      req.user.tenantId,
      clientId,
      file.buffer,
      file.mimetype,
      file.size,
      file.originalname,
    );
  }

  @Post('uploads')
  async createUpload(@Request() req) {
    const validated = mediaUploadSchema.parse(req.body);
    const tenantId = req.user.tenantId;
    const clientId = req.body.clientId || null;

    return this.mediaService.createUpload(
      tenantId,
      clientId,
      validated.mimeType,
      validated.size,
    );
  }

  @Post(':id/confirm')
  async confirmUpload(@Param('id') id: string, @Body() body: any) {
    const validated = mediaConfirmSchema.parse({ mediaId: id, ...body });
    return this.mediaService.confirmUpload(id, {
      width: validated.width ?? null,
      height: validated.height ?? null,
      duration: validated.duration ?? null,
    });
  }

  @Post(':id')
  async getMedia(@Param('id') id: string, @Request() req) {
    return this.mediaService.getMedia(id, req.user.tenantId);
  }
}
