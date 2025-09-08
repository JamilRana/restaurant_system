// src/app/api/promo/validate/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, restaurantId, totalAmount, customerId, email } = body;
    let usageCount = 0;

    // ✅ Validate required inputs
    if (
      !code ||
      !restaurantId ||
      typeof totalAmount !== "number" ||
      totalAmount < 0
    ) {
      return NextResponse.json(
        { error: "Missing or invalid required fields" },
        { status: 400 }
      );
    }

    // ✅ Normalize code
    const normalizedCode = code.trim().toUpperCase();

    // ✅ Find active promo
    const promo = await prisma.promoCode.findFirst({
      where: {
        code: { equals: normalizedCode, mode: "insensitive" },
        active: true,
        restaurantId: Number(restaurantId),
        OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
        AND: {
          OR: [
            { minOrderAmount: null },
            { minOrderAmount: { lte: totalAmount } },
          ],
        },
      },
    });

    if (!promo) {
      return NextResponse.json(
        { error: "Invalid or expired promo code" },
        { status: 404 }
      );
    }

    // ✅ Check global usage limit
    if (promo.maxUses !== null && promo.currentUses >= promo.maxUses) {
      return NextResponse.json(
        { error: "Promo code usage limit exceeded (global)" },
        { status: 400 }
      );
    }

    // ✅ Enforce per-user limit only if needed
    if (promo.maxUsesPerUser !== null && promo.maxUsesPerUser > 0) {
      if (!email && !customerId) {
        return NextResponse.json(
          { error: "Email or customer ID required to use this promo code" },
          { status: 400 }
        );
      }

      if (customerId) {
        // ✅ If we have a customerId, use it (most accurate)
        usageCount = await prisma.userPromoUsage.count({
          where: {
            customerId,
            promoCodeId: promo.id,
          },
        });
      } else if (email) {
        // ✅ Fallback: check if this email already used the promo
        // Find all customers with this email who used the promo
        const usages = await prisma.userPromoUsage.findMany({
          where: {
            promoCodeId: promo.id,
            customer: {
              email: { equals: email, mode: "insensitive" },
            },
          },
        });
        usageCount = usages.length;
      }

      if (usageCount >= promo.maxUsesPerUser) {
        return NextResponse.json(
          {
            error: `This promo code can only be used ${promo.maxUsesPerUser} time(s) per customer.`,
          },
          { status: 400 }
        );
      }
    }

    // ✅ Calculate discount
    let discountAmount = 0;
    if (promo.discountPercent) {
      discountAmount = (totalAmount * Number(promo.discountPercent)) / 100;
    } else if (promo.discountAmount) {
      discountAmount = Number(promo.discountAmount);
    }
    discountAmount = Math.min(discountAmount, totalAmount);

    // ✅ Return success
    return NextResponse.json({
      success: true,
      discountAmount,
      code: promo.code,
      discountPercent: promo.discountPercent,
      maxUses: promo.maxUses,
      currentUses: promo.currentUses,
      maxUsesPerUser: promo.maxUsesPerUser,
      usageCount, // optional: for debugging
    });
  } catch (error: any) {
    console.error("Promo validation error:", error);
    return NextResponse.json(
      {
        error: "Failed to validate promo code",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
