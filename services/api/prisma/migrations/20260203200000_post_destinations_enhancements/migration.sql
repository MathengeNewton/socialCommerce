-- Add hashtags to post_captions
ALTER TABLE "post_captions" ADD COLUMN IF NOT EXISTS "hashtags" TEXT;

-- Add post_url and media_ids to post_destinations
ALTER TABLE "post_destinations" ADD COLUMN IF NOT EXISTS "post_url" TEXT;
ALTER TABLE "post_destinations" ADD COLUMN IF NOT EXISTS "media_ids" JSONB;
