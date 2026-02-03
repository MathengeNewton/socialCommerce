-- Migrate from twitter/pinterest to tiktok
-- Post captions: remove twitter/pinterest (tiktok will be used for new posts)
DELETE FROM "post_captions" WHERE "platform" IN ('twitter', 'pinterest');

-- Integrations: migrate twitter/pinterest to tiktok (placeholder - user will reconnect)
UPDATE "integrations" SET "provider" = 'tiktok' WHERE "provider" IN ('twitter', 'pinterest');

-- Destinations: migrate types
UPDATE "destinations" SET "type" = 'tiktok_account' WHERE "type" IN ('twitter_account', 'pinterest_board');
