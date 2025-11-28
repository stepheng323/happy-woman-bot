-- AlterTable
ALTER TABLE "order_items" ALTER COLUMN "product_name" DROP DEFAULT,
ALTER COLUMN "product_price" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "address" DROP NOT NULL;
