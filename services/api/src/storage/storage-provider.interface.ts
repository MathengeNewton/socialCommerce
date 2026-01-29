/**
 * Abstraction for media storage. Swap implementation via MEDIA_STORAGE=cloudinary | s3
 * so development can use Cloudinary and production can use Spaces (S3).
 */
export interface IStorageProvider {
  /**
   * Upload file buffer and return the URL to store in Media.url.
   * - Cloudinary: returns full public URL (https://res.cloudinary.com/...).
   * - S3/Spaces: returns the object key; getMedia will sign it for access.
   */
  upload(
    buffer: Buffer,
    mimeType: string,
    originalName?: string,
  ): Promise<{ url: string }>;
}

export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');
