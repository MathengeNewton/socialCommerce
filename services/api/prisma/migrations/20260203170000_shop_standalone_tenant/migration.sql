-- Shop standalone: remove clientId from Product, Order, Cart, Receipt; Cart/Order scoped by tenant only

-- Drop FK and column from products
ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_client_id_fkey";
ALTER TABLE "products" DROP COLUMN IF EXISTS "client_id";

-- Drop FK and column from orders
ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_client_id_fkey";
ALTER TABLE "orders" DROP COLUMN IF EXISTS "client_id";

-- Drop FK and column from receipts
ALTER TABLE "receipts" DROP CONSTRAINT IF EXISTS "receipts_client_id_fkey";
ALTER TABLE "receipts" DROP COLUMN IF EXISTS "client_id";

-- Migrate carts: client_id -> tenant_id
ALTER TABLE "carts" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
UPDATE "carts" SET "tenant_id" = COALESCE(
  (SELECT "tenant_id" FROM "clients" WHERE "clients"."id" = "carts"."client_id" LIMIT 1),
  (SELECT "id" FROM "tenants" LIMIT 1)
) WHERE "tenant_id" IS NULL;
ALTER TABLE "carts" DROP CONSTRAINT IF EXISTS "carts_client_id_fkey";
ALTER TABLE "carts" DROP COLUMN IF EXISTS "client_id";
-- Add FK for tenant_id
ALTER TABLE "carts" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "carts" ADD CONSTRAINT "carts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- Drop old unique on cart_token, add composite unique
DROP INDEX IF EXISTS "carts_cart_token_key";
CREATE UNIQUE INDEX "carts_tenant_id_cart_token_key" ON "carts"("tenant_id", "cart_token");
DROP INDEX IF EXISTS "carts_client_id_idx";
CREATE INDEX "carts_tenant_id_idx" ON "carts"("tenant_id");
