-- CreateTable
CREATE TABLE IF NOT EXISTS "storefront_settings" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "hero_image_media_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "storefront_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "storefront_settings_tenant_id_key" ON "storefront_settings"("tenant_id");
CREATE INDEX IF NOT EXISTS "storefront_settings_hero_image_media_id_idx" ON "storefront_settings"("hero_image_media_id");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'storefront_settings_tenant_id_fkey'
  ) THEN
    ALTER TABLE "storefront_settings"
      ADD CONSTRAINT "storefront_settings_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'storefront_settings_hero_image_media_id_fkey'
  ) THEN
    ALTER TABLE "storefront_settings"
      ADD CONSTRAINT "storefront_settings_hero_image_media_id_fkey"
      FOREIGN KEY ("hero_image_media_id") REFERENCES "media"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
