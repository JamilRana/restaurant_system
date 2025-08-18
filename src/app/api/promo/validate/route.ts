// src/app/api/promo/validate/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { code, restaurantId, totalAmount } = await request.json();

    if (!code || !restaurantId || typeof totalAmount !== "number") {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const promo = await prisma.promoCode.findFirst({
      where: {
        code: code.toUpperCase(),
        active: true,
        restaurantId: Number(restaurantId),
        expiresAt: { gte: new Date() }, // Not expired
        minOrderAmount: { lte: totalAmount }, // Minimum order met
      },
    });

    if (!promo) {
      return NextResponse.json(
        { error: "Invalid or expired promo code" },
        { status: 404 }
      );
    }

    // Check maxUses manually
    if (promo.maxUses !== null && promo.currentUses >= promo.maxUses) {
      return NextResponse.json(
        { error: "Promo code usage limit exceeded" },
        { status: 400 }
      );
    }

    let discountAmount = 0;
    if (promo.discountPercent) {
      discountAmount = (totalAmount * promo.discountPercent) / 100;
    } else if (promo.discountAmount) {
      discountAmount = promo.discountAmount;
    }

    discountAmount = Math.min(discountAmount, totalAmount);

    return NextResponse.json({
      success: true,
      discountAmount,
      code: promo.code,
    });
  } catch (error: any) {
    console.error("Promo validation error:", error);
    return NextResponse.json(
      { error: "Failed to validate promo code", details: error.message },
      { status: 500 }
    );
  }
}