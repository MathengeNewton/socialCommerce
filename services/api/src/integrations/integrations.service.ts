import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../audit/audit.service';
import * as crypto from 'crypto';

@Injectable()
export class IntegrationsService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private auditService: AuditService,
  ) {}

  async connect(
    tenantId: string,
    clientId: string,
    provider: string,
    code: string,
    redirectUri?: string,
    userId?: string,
  ) {
    // Validate provider-specific requirements
    if (provider === 'facebook') {
      if (!redirectUri) {
        throw new BadRequestException(
          'Redirect URI is required for Facebook. Use the "Connect Facebook" button from Settings.',
        );
      }
      const appId = this.configService.get<string>('FACEBOOK_APP_ID');
      const appSecret = this.configService.get<string>('FACEBOOK_APP_SECRET');
      if (!appId || !appSecret) {
        throw new BadRequestException(
          'Facebook integration is not configured. Set FACEBOOK_APP_ID and FACEBOOK_APP_SECRET on the API.',
        );
      }
    }
    if (provider === 'instagram') {
      // Instagram uses Facebook Login - same as Facebook
      if (!redirectUri) throw new BadRequestException('Redirect URI is required for Instagram.');
      const appId = this.configService.get<string>('FACEBOOK_APP_ID');
      const appSecret = this.configService.get<string>('FACEBOOK_APP_SECRET');
      if (!appId || !appSecret) {
        throw new BadRequestException('Instagram requires FACEBOOK_APP_ID and FACEBOOK_APP_SECRET.');
      }
    }
    if (provider === 'tiktok') {
      // TikTok: https://developers.tiktok.com/doc/oauth-user-access-token-management
      const clientKey = this.configService.get<string>('TIKTOK_CLIENT_KEY');
      const clientSecret = this.configService.get<string>('TIKTOK_CLIENT_SECRET');
      if (!clientKey || !clientSecret) {
        throw new BadRequestException(
          'TikTok integration is not configured. Set TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET on the API.',
        );
      }
    }

    try {
      // Exchange code for access token (provider-specific)
      const tokens = await this.exchangeCodeForTokens(provider, code, redirectUri);

      // Get user info from provider
      const userInfo = await this.getUserInfo(provider, tokens.accessToken);

      // Store integration
      const existing = await this.prisma.integration.findFirst({
      where: {
        tenantId,
        clientId,
        provider: provider as any,
        externalId: userInfo.id,
      },
    });

    const integration = existing
      ? await this.prisma.integration.update({
          where: { id: existing.id },
          data: {
            accessToken: this.encryptToken(tokens.accessToken),
            refreshToken: tokens.refreshToken ? this.encryptToken(tokens.refreshToken) : null,
            expiresAt: tokens.expiresIn
              ? new Date(Date.now() + tokens.expiresIn * 1000)
              : null,
            metadata: userInfo,
          },
        })
      : await this.prisma.integration.create({
          data: {
            tenantId,
            clientId,
            provider: provider as any,
            externalId: userInfo.id,
            accessToken: this.encryptToken(tokens.accessToken),
            refreshToken: tokens.refreshToken ? this.encryptToken(tokens.refreshToken) : null,
            expiresAt: tokens.expiresIn
              ? new Date(Date.now() + tokens.expiresIn * 1000)
              : null,
            metadata: userInfo,
          },
        });

    // Refresh destinations
    await this.refreshDestinations(integration.id, provider, tokens.accessToken);

      await this.auditService.log(
        tenantId,
        userId ?? null,
        'integration.connect',
        'integration',
        integration.id,
        { provider, clientId },
      );

      return integration;
    } catch (err: unknown) {
      if (err instanceof BadRequestException) throw err;
      const message =
        err instanceof Error ? err.message : 'Integration connection failed';
      throw new BadRequestException(
        message.startsWith('Facebook') || message.startsWith('Redirect')
          ? message
          : `Could not connect ${provider}. ${message}`,
      );
    }
  }

  async findAll(tenantId: string, clientId?: string) {
    const where: any = { tenantId };
    if (clientId) {
      where.clientId = clientId;
    }

    return this.prisma.integration.findMany({
      where,
      include: {
        destinations: true,
      },
    });
  }

  async disconnect(
    tenantId: string,
    integrationId: string,
    userId?: string,
  ) {
    const integration = await this.prisma.integration.findFirst({
      where: {
        id: integrationId,
        tenantId,
      },
    });

    if (!integration) {
      throw new NotFoundException(`Integration with id "${integrationId}" not found`);
    }

    await this.auditService.log(
      tenantId,
      userId ?? null,
      'integration.disconnect',
      'integration',
      integrationId,
      { provider: integration.provider },
    );

    await this.prisma.integration.delete({
      where: { id: integrationId },
    });

    return { success: true };
  }

  async refreshDestinations(integrationId: string, provider: string, accessToken: string) {
    // Fetch destinations from provider API
    const destinations = await this.fetchDestinations(provider, accessToken);

    // Store destinations
    for (const dest of destinations) {
      const existing = await this.prisma.destination.findFirst({
        where: {
          integrationId,
          externalId: dest.id,
        },
      });

      if (existing) {
        await this.prisma.destination.update({
          where: { id: existing.id },
          data: {
            name: dest.name,
            metadata: dest.metadata,
          },
        });
      } else {
        await this.prisma.destination.create({
          data: {
            integrationId,
            type: dest.type as any,
            externalId: dest.id,
            name: dest.name,
            metadata: dest.metadata,
          },
        });
      }
    }

    return destinations;
  }

  private async exchangeCodeForTokens(
    provider: string,
    code: string,
    redirectUri?: string,
  ): Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number }> {
    if ((provider === 'facebook' || provider === 'instagram') && redirectUri) {
      const params = new URLSearchParams({
        client_id: this.configService.get<string>('FACEBOOK_APP_ID')!,
        client_secret: this.configService.get<string>('FACEBOOK_APP_SECRET')!,
        redirect_uri: redirectUri,
        code,
      });
      const res = await fetch(
        `https://graph.facebook.com/v18.0/oauth/access_token?${params.toString()}`,
      );
      if (!res.ok) {
        const body = await res.text();
        const parsed = parseFacebookError(body);
        throw new Error(parsed || 'Facebook token exchange failed. Check redirect URI and try again.');
      }
      const data = (await res.json()) as {
        access_token: string;
        token_type?: string;
        expires_in?: number;
      };
      return {
        accessToken: data.access_token,
        expiresIn: data.expires_in,
      };
    }
    return {
      accessToken: `mock_access_token_${code}`,
      refreshToken: `mock_refresh_token_${code}`,
      expiresIn: 3600,
    };
  }

  private async getUserInfo(
    provider: string,
    accessToken: string,
  ): Promise<{ id: string; name: string; email?: string }> {
    if (provider === 'facebook' || provider === 'instagram') {
      const res = await fetch(
        `https://graph.facebook.com/v18.0/me?fields=id,name&access_token=${encodeURIComponent(accessToken)}`,
      );
      if (!res.ok) {
        const body = await res.text();
        const parsed = parseFacebookError(body);
        throw new Error(parsed || 'Facebook user info failed. Token may be invalid or expired.');
      }
      const data = (await res.json()) as { id: string; name: string };
      return { id: data.id, name: data.name };
    }
    if (provider === 'tiktok') {
      // TikTok User Info: https://developers.tiktok.com/doc/login-kit-user-info
      // Placeholder until OAuth flow is implemented
      return { id: `tt_user_${Date.now()}`, name: 'TikTok User' };
    }
    return { id: `user_${Date.now()}`, name: 'User', email: 'user@example.com' };
  }

  private async fetchDestinations(
    provider: string,
    accessToken: string,
  ): Promise<
    { id: string; type: string; name: string; metadata: Record<string, unknown> }[]
  > {
    if (provider === 'facebook') {
      const res = await fetch(
        `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${encodeURIComponent(accessToken)}`,
      );
      if (!res.ok) {
        const body = await res.text();
        const parsed = parseFacebookError(body);
        throw new Error(parsed || 'Facebook could not load Pages. Check app permissions (pages_show_list, pages_manage_posts).');
      }
      const data = (await res.json()) as {
        data: Array<{
          id: string;
          name: string;
          access_token: string;
          instagram_business_account?: { id: string };
        }>;
      };
      const destinations: { id: string; type: string; name: string; metadata: Record<string, unknown> }[] = [];
      for (const page of data.data || []) {
        destinations.push({
          id: page.id,
          type: 'facebook_page',
          name: page.name,
          metadata: { pageAccessTokenEncrypted: this.encryptToken(page.access_token) },
        });
        if (page.instagram_business_account?.id) {
          destinations.push({
            id: page.instagram_business_account.id,
            type: 'instagram_business',
            name: `${page.name} (Instagram)`,
            metadata: { facebookPageId: page.id, pageAccessTokenEncrypted: this.encryptToken(page.access_token) },
          });
        }
      }
      return destinations;
    }
    if (provider === 'instagram') {
      // Instagram standalone: use Facebook Login with instagram_basic, instagram_content_publish
      // Docs: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login
      return [{ id: `ig_${Date.now()}`, type: 'instagram_business', name: 'Instagram Account', metadata: {} }];
    }
    if (provider === 'tiktok') {
      // TikTok Content Posting API - requires OAuth with video.publish scope
      // Docs: https://developers.tiktok.com/doc/content-posting-api-get-started
      return [{ id: `tt_${Date.now()}`, type: 'tiktok_account', name: 'TikTok Account', metadata: {} }];
    }
    return [];
  }

  private getEncryptionKey(): Buffer {
    const keyRaw = this.configService.get<string>('ENCRYPTION_KEY') || 'default-key-change-me';
    return crypto.createHash('sha256').update(keyRaw, 'utf8').digest();
  }

  private encryptToken(token: string): string {
    const algorithm = 'aes-256-cbc';
    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  decryptToken(encryptedToken: string): string {
    const algorithm = 'aes-256-cbc';
    const key = this.getEncryptionKey();
    const parts = encryptedToken.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}

function parseFacebookError(body: string): string | null {
  try {
    const json = JSON.parse(body) as { error?: { message?: string; code?: number } };
    const msg = json?.error?.message;
    if (msg) return `Facebook: ${msg}`;
  } catch {
    // ignore
  }
  return null;
}
