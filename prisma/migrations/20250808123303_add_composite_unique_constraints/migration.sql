/*
  Warnings:

  - A unique constraint covering the columns `[name,restaurantId]` on the table `Category` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name,restaurantId]` on the table `Food` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Customer_postcode_idx";

-- DropIndex
DROP INDEX "DeliveryZone_postcode_key";

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_restaurantId_key" ON "Category"("name", "restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "Food_name_restaurantId_key" ON "Food"("name", "restaurantId");
