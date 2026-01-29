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
  TWITTER: 'twitter',
  PINTEREST: 'pinterest',
} as const;

export const DESTINATION_TYPES = {
  FACEBOOK_PAGE: 'facebook_page',
  INSTAGRAM_BUSINESS: 'instagram_business',
  TWITTER_ACCOUNT: 'twitter_account',
  PINTEREST_BOARD: 'pinterest_board',
} as const;

// Media validation
export const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'video/mp4',
] as const;

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// Caption limits per platform
export const CAPTION_LIMITS = {
  facebook: 5000,
  instagram: 2200,
  twitter: 280,
  pinterest: 500,
} as const;

// Rate limits per platform (requests per minute)
export const RATE_LIMITS = {
  facebook: 200,
  instagram: 200,
  twitter: 300,
  pinterest: 100,
} as const;
