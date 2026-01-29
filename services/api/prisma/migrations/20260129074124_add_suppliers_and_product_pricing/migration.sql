/*
  Warnings:

  - Added the required column `list_price` to the `products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `min_sell_price` to the `products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `supplier_id` to the `products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `supply_price` to the `products` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "products" ADD COLUMN     "list_price" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "min_sell_price" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "price_disclaimer" TEXT,
ADD COLUMN     "supplier_id" TEXT NOT NULL,
ADD COLUMN     "supply_price" DECIMAL(10,2) NOT NULL;

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "suppliers_tenant_id_idx" ON "suppliers"("tenant_id");

-- CreateIndex
CREATE INDEX "products_supplier_id_idx" ON "products"("supplier_id");

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
