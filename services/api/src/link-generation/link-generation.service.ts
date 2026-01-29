import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LinkGenerationService {
  constructor(private configService: ConfigService) {}

  generateProductLink(productSlug: string, platform: string): string {
    const shopDomain = this.configService.get<string>('SHOP_DOMAIN') || 'shop.domain';
    const baseUrl = `https://${shopDomain}/p/${productSlug}`;

    const utmParams = new URLSearchParams({
      utm_source: platform,
      utm_medium: 'social',
      utm_campaign: 'post',
    });

    return `${baseUrl}?${utmParams.toString()}`;
  }

  appendLinkToCaption(
    caption: string,
    link: string,
    platform: string,
    includeLink: boolean = true,
  ): string {
    if (!includeLink) {
      return caption;
    }

    // Platform-specific formatting
    switch (platform.toLowerCase()) {
      case 'facebook':
      case 'instagram':
        return `${caption}\n\n🔗 ${link}`;
      case 'twitter':
        return `${caption}\n\n${link}`;
      case 'pinterest':
        return `${caption}\n\n${link}`;
      default:
        return `${caption}\n\n${link}`;
    }
  }
}
