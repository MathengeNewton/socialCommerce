// Shared constants across the platform

export const ROLES = {
  ADMIN: 'admin',
  STAFF: 'staff',
} as const;

export const PRODUCT_STATUSES = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
} as const;

export const POST_STATUSES = {
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  PUBLISHING: 'publishing',
  PUBLISHED: 'published',
  FAILED: 'failed',
} as const;

export const ORDER_STATUSES = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  COMPLETE: 'complete',
  CANCELLED: 'cancelled',
} as const;

export const INTEGRATION_PROVIDERS = {
  FACEBOOK: 'facebook',
  INSTAGRAM: 'instagram',
  TIKTOK: 'tiktok',
  TWITTER: 'twitter',
} as const;

export const DESTINATION_TYPES = {
  FACEBOOK_PAGE: 'facebook_page',
  INSTAGRAM_BUSINESS: 'instagram_business',
  TIKTOK_ACCOUNT: 'tiktok_account',
  TWITTER_ACCOUNT: 'twitter_account',
} as const;

// Media validation
export const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'video/mp4',
] as const;

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// Caption limits per platform (from platform docs)
// Facebook 5000, Instagram 2200, TikTok 2200, Twitter/X 280 (25k for Premium)
export const CAPTION_LIMITS = {
  facebook: 5000,
  instagram: 2200,
  tiktok: 2200,
  twitter: 280,
} as const;

// Rate limits per platform (requests per minute)
// TikTok: 6/min for video init, 20/min for creator_info
export const RATE_LIMITS = {
  facebook: 200,
  instagram: 200,
  tiktok: 6,
  twitter: 50,
} as const;
