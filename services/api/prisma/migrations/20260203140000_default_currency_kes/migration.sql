-- Change default currency from USD to KES (Kenyan Shilling)
ALTER TABLE "products" ALTER COLUMN "currency" SET DEFAULT 'KES';
ALTER TABLE "orders" ALTER COLUMN "currency" SET DEFAULT 'KES';
ALTER TABLE "tariffs" ALTER COLUMN "currency" SET DEFAULT 'KES';
