# TikTok Integration Setup

This guide covers the TikTok Developer Portal configuration required for OAuth and Content Posting.

## 1. Create an App

1. Go to [developers.tiktok.com](https://developers.tiktok.com)
2. Sign in and create a new app (or use an existing one)
3. Note your **Client Key** and **Client Secret**

## 2. Add Products

### Login Kit (for OAuth)

1. In your app, go to **Products** → **Login Kit**
2. Add Login Kit if not already added
3. In **Login Kit settings**, add your **Redirect URIs**:
   - Production: `https://admin.hhourssop.co.ke/settings/oauth/tiktok`
   - Add any other environments (e.g. staging) if needed

**Redirect URI rules:**
- Must use HTTPS (no `http://`)
- No localhost – use a public URL (e.g. ngrok for local dev)
- No query params or fragments
- Max 10 URIs, each under 512 characters

### Content Posting API

1. Go to **Products** → **Content Posting API**
2. Add the product and enable **Direct Post**
3. Request the **video.publish** scope (and **video.upload** if you want drafts)
4. Complete any required app review/audit for production use

## 3. Domain Verification (for PULL_FROM_URL)

TikTok requires your video URL domain to be verified before using `PULL_FROM_URL` (pulling video from your URL).

1. Go to **Settings** → **Domain management** (or similar)
2. Add your domain prefix (e.g. `https://api.hhourssop.co.ke` or your Cloudinary/S3 domain)
3. Download the verification file TikTok provides
4. Place it at the root of that domain so it’s accessible at:
   `https://your-domain.com/tiktok{random}.txt`
5. Click **Verify** in the TikTok portal

**Where your videos are hosted:**
- **Cloudinary**: Verify `res.cloudinary.com` or your custom Cloudinary domain
- **S3 / Spaces**: Verify the domain that serves your media (e.g. `https://your-bucket.nyc3.digitaloceanspaces.com`)
- **API proxy**: If you proxy media through `api.hhourssop.co.ke`, verify that domain

## 4. Environment Variables

Set these in your `.env` (and in Docker/deploy config):

| Variable | Where | Description |
|----------|-------|-------------|
| `TIKTOK_CLIENT_KEY` | API | From TikTok Developer Portal |
| `TIKTOK_CLIENT_SECRET` | API | From TikTok Developer Portal |
| `NEXT_PUBLIC_TIKTOK_CLIENT_KEY` | Admin (frontend) | Same as Client Key – used to build OAuth URL |

## 5. Checklist

- [ ] App created at developers.tiktok.com
- [ ] Content Posting API added and Direct Post enabled
- [ ] video.publish scope requested and approved
- [ ] Login Kit added and redirect URIs configured
- [ ] Domain verified (for video PULL_FROM_URL)
- [ ] Client Key and Client Secret copied
- [ ] `TIKTOK_CLIENT_KEY` and `TIKTOK_CLIENT_SECRET` set in API `.env`
- [ ] `NEXT_PUBLIC_TIKTOK_CLIENT_KEY` set in admin `.env` / docker-compose

## 6. Per-Client OAuth

Each client connects their own TikTok account:

1. Go to **Clients** → select a client → **Integrations**
2. Or go to **Integrations** → select client from dropdown
3. Click **Connect** for TikTok
4. Log in with that client’s TikTok account
5. Tokens are stored per client; posts publish to the connected account

## 7. Notes

- **Rate limits**: 6 video init requests per minute per user token
- **Unaudited apps**: Content may be restricted to private until your app passes TikTok’s review
- **Video format**: MP4 with H.264 recommended; max duration depends on creator settings
