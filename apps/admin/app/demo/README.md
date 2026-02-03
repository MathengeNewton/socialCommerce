# Demo Mode (TikTok Recording)

Frontend-only mock for recording TikTok integration demos.

## What it mocks

- **User**: demo@hhourssop.co.ke (admin)
- **Client**: Acme Brand (with TikTok connected)
- **TikTok integration**: Login Kit + Content Posting API
- **Scopes**: user.info.basic, video.publish, video.upload
- **Sample posts**: 2 published to TikTok, 1 scheduled
- **Sample products**: Wireless Earbuds Pro, Smart Watch Series X

## How to use

1. Go to `/login`
2. Click **"Enter demo mode (TikTok + sample data)"**
3. You’re logged in with mock data; explore dashboard, clients, posts, compose, integrations
4. Click **"Exit demo"** in the banner to return to login

Or add `?demo=1` to any URL to enable demo mode.

## How to strip back

To remove demo mode:

1. Delete `apps/admin/app/demo/` folder
2. In `Providers.tsx`: remove the `import '../demo/mockFetch'` and `<DemoInit />`
3. In `login/page.tsx`: remove the demo button and `enableDemoMode` import
