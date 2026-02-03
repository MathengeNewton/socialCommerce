/**
 * Demo mode mock data for TikTok recording.
 * Scopes: user.info.basic, video.publish, video.upload
 * Products: Login Kit, Content Posting API
 */

const DEMO_TENANT_ID = 'demo-tenant-001';
const DEMO_USER_ID = 'demo-user-001';
const DEMO_CLIENT_ID = 'demo-client-001';
const DEMO_TIKTOK_INTEGRATION_ID = 'demo-tiktok-int-001';
const DEMO_TIKTOK_DESTINATION_ID = 'demo-tiktok-dest-001';
const DEMO_POST_1 = 'demo-post-001';
const DEMO_POST_2 = 'demo-post-002';
const DEMO_POST_3 = 'demo-post-003';
const DEMO_PRODUCT_1 = 'demo-product-001';
const DEMO_PRODUCT_2 = 'demo-product-002';
const DEMO_MEDIA_ID = 'demo-media-001';

export const demoUser = {
  id: DEMO_USER_ID,
  email: 'demo@hhourssop.co.ke',
  name: 'Demo User',
  role: 'admin',
  tenantId: DEMO_TENANT_ID,
  memberships: [
    { clientId: DEMO_CLIENT_ID, clientName: 'Acme Brand', role: 'admin' },
  ],
};

export const demoClients = [
  {
    id: DEMO_CLIENT_ID,
    name: 'Acme Brand',
    active: true,
    tenantId: DEMO_TENANT_ID,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-client-002',
    name: 'Nairobi Fashion Co',
    active: true,
    tenantId: DEMO_TENANT_ID,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const demoTikTokIntegration = {
  id: DEMO_TIKTOK_INTEGRATION_ID,
  clientId: DEMO_CLIENT_ID,
  provider: 'tiktok',
  externalId: 'tt_openid_demo123',
  metadata: {
    name: 'Acme Brand TikTok',
    display_name: 'Acme Brand',
    open_id: 'tt_openid_demo123',
  },
  destinations: [
    {
      id: DEMO_TIKTOK_DESTINATION_ID,
      type: 'tiktok_account',
      name: 'Acme Brand TikTok',
      externalId: 'tt_openid_demo123',
    },
  ],
};

export const demoIntegrations = [demoTikTokIntegration];

export const demoProducts = [
  {
    id: DEMO_PRODUCT_1,
    title: 'Wireless Earbuds Pro',
    slug: 'wireless-earbuds-pro',
    description: 'Premium noise-cancelling wireless earbuds',
    status: 'published',
    tenantId: DEMO_TENANT_ID,
    price: 4500,
    currency: 'KES',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    variants: [
      { id: 'v1', sku: 'EARBUDS-BLK', name: 'Default', stock: 50 },
    ],
    images: [],
  },
  {
    id: DEMO_PRODUCT_2,
    title: 'Smart Watch Series X',
    slug: 'smart-watch-series-x',
    description: 'Fitness tracking and notifications',
    status: 'published',
    tenantId: DEMO_TENANT_ID,
    price: 12000,
    currency: 'KES',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    variants: [
      { id: 'v2', sku: 'WATCH-X', name: 'Default', stock: 25 },
    ],
    images: [],
  },
];

const now = new Date();
const yesterday = new Date(now);
yesterday.setDate(yesterday.getDate() - 1);
const lastWeek = new Date(now);
lastWeek.setDate(lastWeek.getDate() - 7);

export const demoPosts = [
  {
    id: DEMO_POST_1,
    status: 'published',
    scheduledAt: null,
    createdAt: lastWeek.toISOString(),
    clientId: DEMO_CLIENT_ID,
    tenantId: DEMO_TENANT_ID,
    client: { id: DEMO_CLIENT_ID, name: 'Acme Brand' },
    captions: [
      { platform: 'tiktok', caption: 'Check out our new Wireless Earbuds Pro! 🎧 #TechTuesday #NewArrival', hashtags: '#TechTuesday #NewArrival', includeLink: true },
    ],
    media: [
      { media: { url: 'https://placehold.co/400x400/1a1a2e/eee?text=Video+1', mimeType: 'video/mp4' } },
    ],
    destinations: [
      {
        status: 'published',
        externalPostId: 'tiktok_post_7123456789',
        postUrl: 'https://www.tiktok.com/@acmebrand/video/7123456789',
        publishedAt: lastWeek.toISOString(),
        destination: {
          id: DEMO_TIKTOK_DESTINATION_ID,
          name: 'Acme Brand TikTok',
          type: 'tiktok_account',
          integration: { provider: 'tiktok' },
        },
      },
    ],
  },
  {
    id: DEMO_POST_2,
    status: 'published',
    scheduledAt: null,
    createdAt: yesterday.toISOString(),
    clientId: DEMO_CLIENT_ID,
    tenantId: DEMO_TENANT_ID,
    client: { id: DEMO_CLIENT_ID, name: 'Acme Brand' },
    captions: [
      { platform: 'tiktok', caption: 'Smart Watch Series X – Your fitness companion! ⌚ #FitnessGoals', hashtags: '#FitnessGoals #SmartWatch', includeLink: true },
    ],
    media: [
      { media: { url: 'https://placehold.co/400x400/16213e/eee?text=Video+2', mimeType: 'video/mp4' } },
    ],
    destinations: [
      {
        status: 'published',
        externalPostId: 'tiktok_post_7123456790',
        postUrl: 'https://www.tiktok.com/@acmebrand/video/7123456790',
        publishedAt: yesterday.toISOString(),
        destination: {
          id: DEMO_TIKTOK_DESTINATION_ID,
          name: 'Acme Brand TikTok',
          type: 'tiktok_account',
          integration: { provider: 'tiktok' },
        },
      },
    ],
  },
  {
    id: DEMO_POST_3,
    status: 'scheduled',
    scheduledAt: new Date(now.getTime() + 86400000).toISOString(),
    createdAt: now.toISOString(),
    clientId: DEMO_CLIENT_ID,
    tenantId: DEMO_TENANT_ID,
    client: { id: DEMO_CLIENT_ID, name: 'Acme Brand' },
    captions: [
      { platform: 'tiktok', caption: 'Coming soon: Unboxing our bestsellers! Stay tuned 🎬', hashtags: '#Unboxing #Bestseller', includeLink: false },
    ],
    media: [
      { media: { url: 'https://placehold.co/400x400/0f3460/eee?text=Scheduled', mimeType: 'image/jpeg' } },
    ],
    destinations: [
      {
        status: 'scheduled',
        externalPostId: null,
        postUrl: null,
        publishedAt: null,
        destination: {
          id: DEMO_TIKTOK_DESTINATION_ID,
          name: 'Acme Brand TikTok',
          type: 'tiktok_account',
          integration: { provider: 'tiktok' },
        },
      },
    ],
  },
];

export const demoClientDetail = {
  ...demoClients[0],
  integrations: [demoTikTokIntegration],
  postCountByStatus: { draft: 0, scheduled: 1, published: 2, failed: 0 },
  totalPosts: 3,
};

export const demoDestinations = [
  {
    id: DEMO_TIKTOK_DESTINATION_ID,
    type: 'tiktok_account',
    name: 'Acme Brand TikTok',
    externalId: 'tt_openid_demo123',
    integration: { provider: 'tiktok' },
  },
];

export const demoDashboardStats = {
  products: 2,
  orders: 5,
  posts: 3,
  integrations: 1,
  clients: 2,
};

export const demoActivity = [
  { type: 'post', id: DEMO_POST_2, label: 'Acme Brand: Smart Watch Series X – Your fitness companion!', createdAt: yesterday.toISOString() },
  { type: 'post', id: DEMO_POST_1, label: 'Acme Brand: Check out our new Wireless Earbuds Pro!', createdAt: lastWeek.toISOString() },
  { type: 'client', id: DEMO_CLIENT_ID, label: 'Acme Brand – TikTok connected', createdAt: lastWeek.toISOString() },
];

export const demoCategories = [
  { id: 'cat-1', name: 'Electronics', slug: 'electronics', productCount: 2 },
];

export const demoTariffs = [
  { id: 'tariff-1', name: 'Starter', monthlyPrice: 5000 },
];
