-- AlterTable
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "is_featured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "featured_order" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE IF NOT EXISTS "service_packages" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "short_description" TEXT NOT NULL,
  "price_label" TEXT NOT NULL,
  "cadence" TEXT,
  "features_json" JSONB NOT NULL DEFAULT '[]',
  "cta_label" TEXT NOT NULL DEFAULT 'Book consultation',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "display_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "service_packages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "service_packages_tenant_id_slug_key" ON "service_packages"("tenant_id", "slug");
CREATE INDEX IF NOT EXISTS "products_tenant_id_is_featured_featured_order_idx" ON "products"("tenant_id", "is_featured", "featured_order");
CREATE INDEX IF NOT EXISTS "service_packages_tenant_id_is_active_display_order_idx" ON "service_packages"("tenant_id", "is_active", "display_order");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'service_packages_tenant_id_fkey'
  ) THEN
    ALTER TABLE "service_packages"
      ADD CONSTRAINT "service_packages_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
