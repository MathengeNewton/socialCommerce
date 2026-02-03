-- Rename role 'agent' to 'staff' for consistency
UPDATE "users" SET "role" = 'staff' WHERE "role" = 'agent';

-- Update default for new users
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'staff';
