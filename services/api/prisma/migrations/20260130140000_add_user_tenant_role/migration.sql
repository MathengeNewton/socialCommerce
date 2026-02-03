-- AlterTable
ALTER TABLE "users" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'agent';

-- Backfill existing users as admin
UPDATE "users" SET "role" = 'admin';
