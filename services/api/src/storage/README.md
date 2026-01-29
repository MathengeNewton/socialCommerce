# Media storage (Cloudinary / S3)

Media uploads use a swappable provider so you can use **Cloudinary** in development and **Spaces (S3)** in production.

## Environment

Set in `.env` (or docker-compose env):

- **`MEDIA_STORAGE`**: `cloudinary` (default) or `s3`

### Cloudinary (development)

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_UPLOAD_FOLDER` (optional, default: `social-commerce`)

### S3 / Spaces (production)

When `MEDIA_STORAGE=s3`, the existing S3/Minio env is used:

- `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, etc.

Uploaded files are stored by key; `getMedia` returns a signed URL.

## Swapping

1. **Development:** Set `MEDIA_STORAGE=cloudinary` and Cloudinary env vars. Images are stored in Cloudinary and the full URL is saved in `Media.url`.
2. **Production:** Set `MEDIA_STORAGE=s3` and point S3 env to DigitalOcean Spaces (or any S3-compatible store). The API stores the object key in `Media.url` and returns signed URLs from `getMedia`.

No code changes needed; only env and `MEDIA_STORAGE` value.
