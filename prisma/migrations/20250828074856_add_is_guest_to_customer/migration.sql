/*
  Warnings:

  - You are about to drop the column `promoCode` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `dateTime` on the `Reservation` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[number,restaurantId]` on the table `Table` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `startsAt` to the `Reservation` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "UserPromoUsage" DROP CONSTRAINT "UserPromoUsage_userId_fkey";

-- DropIndex
DROP INDEX "Reservation_dateTime_idx";

-- DropIndex
DROP INDEX "Table_number_key";

-- DropIndex
DROP INDEX "UserPromoUsage_userId_promoCodeId_key";

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "isGuest" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "promoCode",
ADD COLUMN     "promoCodeId" INTEGER;

-- AlterTable
ALTER TABLE "Reservation" DROP COLUMN "dateTime",
ADD COLUMN     "startsAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "Reservation_startsAt_idx" ON "Reservation"("startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "Table_number_restaurantId_key" ON "Table"("number", "restaurantId");

-- CreateIndex
CREATE INDEX "UserPromoUsage_userId_promoCodeId_idx" ON "UserPromoUsage"("userId", "promoCodeId");

-- CreateIndex
CREATE INDEX "UserPromoUsage_promoCodeId_idx" ON "UserPromoUsage"("promoCodeId");

-- CreateIndex
CREATE INDEX "UserPromoUsage_usedAt_idx" ON "UserPromoUsage"("usedAt");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "PromoCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPromoUsage" ADD CONSTRAINT "UserPromoUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
