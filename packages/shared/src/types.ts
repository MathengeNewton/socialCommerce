// Domain types shared across the platform

export enum UserRole {
  ADMIN = 'admin',
  STAFF = 'staff',
}

export enum ProductStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
}

export enum PostStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  PUBLISHING = 'publishing',
  PUBLISHED = 'published',
  FAILED = 'failed',
}

export enum OrderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  COMPLETE = 'complete',
  CANCELLED = 'cancelled',
}

export enum IntegrationProvider {
  FACEBOOK = 'facebook',
  INSTAGRAM = 'instagram',
  TIKTOK = 'tiktok',
}

export enum DestinationType {
  FACEBOOK_PAGE = 'facebook_page',
  INSTAGRAM_BUSINESS = 'instagram_business',
  TIKTOK_ACCOUNT = 'tiktok_account',
}

export interface Tenant {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Client {
  id: string;
  tenantId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Membership {
  id: string;
  userId: string;
  clientId: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: string;
  tenantId: string;
  clientId: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  slug: string;
  status: ProductStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  name: string;
  stock: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Media {
  id: string;
  tenantId: string;
  clientId: string | null;
  url: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  duration: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Post {
  id: string;
  tenantId: string;
  clientId: string;
  status: PostStatus;
  scheduledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PostDestination {
  id: string;
  postId: string;
  destinationId: string;
  status: PostStatus;
  externalPostId: string | null;
  error: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PostCaption {
  id: string;
  postId: string;
  platform: IntegrationProvider;
  caption: string;
  includeLink: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PostMedia {
  id: string;
  postId: string;
  mediaId: string;
  order: number;
  createdAt: Date;
}

export interface PostProduct {
  id: string;
  postId: string;
  productId: string;
  isPrimary: boolean;
  createdAt: Date;
}

export interface Integration {
  id: string;
  tenantId: string;
  clientId: string;
  provider: IntegrationProvider;
  externalId: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Destination {
  id: string;
  integrationId: string;
  type: DestinationType;
  externalId: string;
  name: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  id: string;
  tenantId: string;
  clientId: string;
  publicId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  customerAddress: string | null;
  status: OrderStatus;
  total: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  price: number;
  createdAt: Date;
}

/** Result of a single row in a bulk import */
export interface BulkImportRowResult {
  rowIndex: number;
  success: boolean;
  id?: string;
  error?: string;
}

/** Response shape for bulk import endpoints */
export interface BulkImportResult {
  summary: { total: number; succeeded: number; failed: number };
  results: BulkImportRowResult[];
}
