-- CreateTable
CREATE TABLE "carts" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "cart_token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" TEXT NOT NULL,
    "cart_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "variant_id" TEXT,
    "quantity" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "delivery_type" TEXT NOT NULL DEFAULT 'pickup';
ALTER TABLE "orders" ADD COLUMN "customer_preference" TEXT;
ALTER TABLE "orders" ADD COLUMN "is_genuine" BOOLEAN;
ALTER TABLE "orders" ADD COLUMN "fulfillment_notes" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "carts_cart_token_key" ON "carts"("cart_token");

-- CreateIndex
CREATE INDEX "carts_client_id_idx" ON "carts"("client_id");

-- CreateIndex
CREATE INDEX "carts_cart_token_idx" ON "carts"("cart_token");

-- CreateIndex
CREATE INDEX "cart_items_cart_id_idx" ON "cart_items"("cart_id");

-- CreateIndex
CREATE INDEX "cart_items_product_id_idx" ON "cart_items"("product_id");

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
