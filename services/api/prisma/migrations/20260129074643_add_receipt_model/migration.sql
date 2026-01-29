-- CreateTable
CREATE TABLE "receipts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "receipt_number" TEXT NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total_paid" DECIMAL(10,2) NOT NULL,
    "payment_method" TEXT NOT NULL,
    "metadata_json" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "receipts_order_id_key" ON "receipts"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "receipts_receipt_number_key" ON "receipts"("receipt_number");

-- CreateIndex
CREATE INDEX "receipts_tenant_id_idx" ON "receipts"("tenant_id");

-- CreateIndex
CREATE INDEX "receipts_client_id_idx" ON "receipts"("client_id");

-- CreateIndex
CREATE INDEX "receipts_order_id_idx" ON "receipts"("order_id");

-- CreateIndex
CREATE INDEX "receipts_receipt_number_idx" ON "receipts"("receipt_number");

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
