import { Test, TestingModule } from '@nestjs/testing';
import { LinkGenerationService } from './link-generation.service';
import { ConfigService } from '@nestjs/config';

describe('LinkGenerationService', () => {
  let service: LinkGenerationService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'SHOP_DOMAIN') return 'shop.domain';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LinkGenerationService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<LinkGenerationService>(LinkGenerationService);
  });

  describe('generateProductLink', () => {
    it('should generate link with UTM parameters', () => {
      const productSlug = 'test-product';
      const platform = 'facebook';

      const link = service.generateProductLink(productSlug, platform);

      expect(link).toContain('shop.domain/p/');
      expect(link).toContain(productSlug);
      expect(link).toContain('utm_source=facebook');
      expect(link).toContain('utm_medium=social');
      expect(link).toContain('utm_campaign=post');
    });

    it('should handle different platforms', () => {
      const platforms = ['facebook', 'instagram', 'twitter', 'pinterest'];

      platforms.forEach((platform) => {
        const link = service.generateProductLink('product', platform);
        expect(link).toContain(`utm_source=${platform}`);
      });
    });
  });

  describe('appendLinkToCaption', () => {
    it('should append link to caption for Facebook', () => {
      const caption = 'Check out this amazing product!';
      const link = 'https://shop.domain/p/test?utm_source=facebook';
      const result = service.appendLinkToCaption(caption, link, 'facebook');

      expect(result).toContain(caption);
      expect(result).toContain(link);
    });

    it('should append link to caption for Instagram', () => {
      const caption = 'Amazing product alert!';
      const link = 'https://shop.domain/p/test?utm_source=instagram';
      const result = service.appendLinkToCaption(caption, link, 'instagram');

      expect(result).toContain(caption);
      expect(result).toContain(link);
    });

    it('should append link to caption for Twitter', () => {
      const caption = 'Check this out!';
      const link = 'https://shop.domain/p/test?utm_source=twitter';
      const result = service.appendLinkToCaption(caption, link, 'twitter');

      expect(result).toContain(caption);
      expect(result).toContain(link);
    });

    it('should not append link when includeLink is false', () => {
      const caption = 'Just a caption';
      const link = 'https://shop.domain/p/test';
      const result = service.appendLinkToCaption(caption, link, 'facebook', false);

      expect(result).toBe(caption);
      expect(result).not.toContain(link);
    });
  });
});
