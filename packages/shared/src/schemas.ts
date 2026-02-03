import { z } from 'zod';

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string(),
});

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(255),
  role: z.enum(['admin', 'staff']),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  role: z.enum(['admin', 'staff']).optional(),
  password: z.string().min(8).optional(),
});

// Product schemas
const productBaseSchema = z.object({
  supplierId: z.string().uuid(),
  categoryId: z.string().uuid().nullable().optional(),
  title: z.string().min(1).max(255),
  description: z.string().max(5000),
  price: z.number().positive(), // Legacy field, use listPrice
  currency: z.string().length(3),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  status: z.enum(['draft', 'published']),
  supplyPrice: z.number().positive(),
  minSellPrice: z.number().positive(),
  listPrice: z.number().positive(),
  priceDisclaimer: z.string().max(500).optional(),
  variantName: z.string().optional(),
  variantOptions: z.array(z.string()).optional(),
  imageIds: z.array(z.string().uuid()).optional(),
});

export const createProductSchema = productBaseSchema.refine((data) => data.listPrice >= data.minSellPrice, {
  message: 'listPrice must be >= minSellPrice',
  path: ['listPrice'],
});

export const updateProductSchema = productBaseSchema
  .partial()
  .refine(
    (data) => {
      if (data.listPrice !== undefined && data.minSellPrice !== undefined) {
        return data.listPrice >= data.minSellPrice;
      }
      return true;
    },
    {
      message: 'listPrice must be >= minSellPrice',
      path: ['listPrice'],
    },
  );

// Media schemas
export const mediaUploadSchema = z.object({
  mimeType: z.enum(['image/png', 'image/jpeg', 'image/jpg', 'video/mp4']),
  size: z.number().max(50 * 1024 * 1024), // 50MB
});

export const mediaConfirmSchema = z.object({
  mediaId: z.string().uuid(),
  width: z.number().positive().nullable().optional(),
  height: z.number().positive().nullable().optional(),
  duration: z.number().positive().nullable().optional(),
});

// Post schemas
const platformCaptionSchema = z.object({
  text: z.string(),
  hashtags: z.string().optional(),
  includeLink: z.boolean(),
});

export const createPostSchema = z.object({
  captions: z.record(
    z.enum(['facebook', 'instagram', 'tiktok', 'twitter']),
    platformCaptionSchema
  ),
  destinationIds: z.array(z.string().uuid()),
  mediaIds: z.array(z.string().uuid()).min(1),
  mediaPerDestination: z.record(z.string().uuid(), z.array(z.string().uuid())).optional(),
  productIds: z.array(z.string().uuid()).optional(),
  primaryProductId: z.string().uuid().optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
});

export const updatePostSchema = createPostSchema.partial();

export const publishPostSchema = z.object({
  postId: z.string().uuid(),
});

export const schedulePostSchema = z.object({
  postId: z.string().uuid(),
  scheduledAt: z.string().datetime(),
});

// Integration schemas
export const connectIntegrationSchema = z.object({
  provider: z.enum(['facebook', 'instagram', 'tiktok', 'twitter']),
  code: z.string(),
  redirectUri: z.string().url(),
});

// Order schemas
export const createOrderSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      variantId: z.string().uuid().nullable().optional(),
      quantity: z.number().int().positive(),
    })
  ),
  customerName: z.string().min(1),
  customerEmail: z
    .string()
    .min(1, 'Email is required')
    .refine((val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), 'Please enter a valid email address'),
  customerPhone: z.string().optional(),
  customerAddress: z.string().optional(),
  deliveryType: z.enum(['pickup', 'delivery']).default('pickup'),
  customerPreference: z.string().optional(),
});

// Cart schemas
export const addToCartSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().nullable().optional(),
  quantity: z.number().int().positive(),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().positive(),
});
