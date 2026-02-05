import { Controller, Get, Param, Query, Res, NotFoundException } from '@nestjs/common';
import { MediaService } from './media.service';

/**
 * Public media stream for TikTok PULL_FROM_URL.
 * TikTok requires the video URL domain to be verified. By proxying through our API domain,
 * you can verify api.yourdomain.com in the TikTok Developer Portal.
 * URLs are signed with a time-limited token (24h).
 */
@Controller('media')
export class MediaStreamController {
  constructor(private mediaService: MediaService) {}

  @Get('public/:id/stream')
  async stream(
    @Param('id') id: string,
    @Query('token') token: string,
    @Query('expires') expires: string,
    @Res() res: { status: (n: number) => { send: (s: string) => void }; setHeader: (k: string, v: string) => void; send: (b: Buffer) => void },
  ) {
    if (!token || !expires) {
      res.status(400).send('Missing token or expires');
      return;
    }
    const expiresNum = parseInt(expires, 10);
    if (isNaN(expiresNum) || Date.now() > expiresNum) {
      res.status(403).send('Link expired');
      return;
    }
    const expectedToken = this.mediaService.getStreamToken(id, expiresNum);
    if (token !== expectedToken) {
      res.status(403).send('Invalid token');
      return;
    }
    try {
      await this.mediaService.streamMedia(id, res);
    } catch (e) {
      if (e instanceof NotFoundException) {
        res.status(404).send('Not found');
        return;
      }
      throw e;
    }
  }
}
