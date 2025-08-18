-- CreateTable
CREATE TABLE "UserPromoUsage" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "promoCodeId" INTEGER NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPromoUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserPromoUsage_userId_promoCodeId_key" ON "UserPromoUsage"("userId", "promoCodeId");

-- AddForeignKey
ALTER TABLE "UserPromoUsage" ADD CONSTRAINT "UserPromoUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPromoUsage" ADD CONSTRAINT "UserPromoUsage_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "PromoCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
