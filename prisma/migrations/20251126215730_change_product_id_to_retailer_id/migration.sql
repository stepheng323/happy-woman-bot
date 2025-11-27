-- DropForeignKey
ALTER TABLE "cart" DROP CONSTRAINT IF EXISTS "cart_product_id_fkey";

-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT IF EXISTS "order_items_product_id_fkey";

-- DropIndex
DROP INDEX IF EXISTS "cart_user_id_product_id_key";

-- AlterTable
ALTER TABLE "cart" RENAME COLUMN "product_id" TO "product_retailer_id";

-- AlterTable
ALTER TABLE "order_items" RENAME COLUMN "product_id" TO "product_retailer_id";

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN "product_name" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN "product_price" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "cart_user_id_product_retailer_id_key" ON "cart"("user_id", "product_retailer_id");

