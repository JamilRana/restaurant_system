/*
  Warnings:

  - You are about to drop the column `userId` on the `UserPromoUsage` table. All the data in the column will be lost.
  - Added the required column `customerId` to the `UserPromoUsage` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "UserPromoUsage" DROP CONSTRAINT "UserPromoUsage_userId_fkey";

-- DropIndex
DROP INDEX "UserPromoUsage_userId_promoCodeId_idx";

-- AlterTable
ALTER TABLE "UserPromoUsage" DROP COLUMN "userId",
ADD COLUMN     "customerId" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "UserPromoUsage_customerId_idx" ON "UserPromoUsage"("customerId");

-- CreateIndex
CREATE INDEX "UserPromoUsage_customerId_promoCodeId_idx" ON "UserPromoUsage"("customerId", "promoCodeId");

-- AddForeignKey
ALTER TABLE "UserPromoUsage" ADD CONSTRAINT "UserPromoUsage_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
