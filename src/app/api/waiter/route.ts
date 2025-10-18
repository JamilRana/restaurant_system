// app/api/waiter/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/authOptions";
import { Decimal } from "@prisma/client/runtime/library";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (
      !session ||
      !["ADMIN", "WAITER", "KITCHEN"].includes(session.user.role)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      deliveryType,
      tableId,
      email,
      orderNote,
      promoCode,
      items,
      paymentMethod,
      isPaid,
    }: {
      deliveryType: "PICKUP" | "DINEIN";
      tableId?: number;
      email?: string;
      orderNote?: string;
      promoCode?: string;
      items: Array<{
        foodId: number;
        quantity: number;
        foodOptionId?: number;
        notes?: string;
      }>;
      paymentMethod?: "CARD" | "CASH";
      isPaid?: boolean;
    } = await req.json();

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required" },
        { status: 400 }
      );
    }

    if (deliveryType === "DINEIN" && !tableId) {
      return NextResponse.json(
        { error: "Table is required for Dine-in" },
        { status: 400 }
      );
    }

    const restaurantId = session.user.restaurantId;
    if (!restaurantId) {
      return NextResponse.json(
        { error: "No restaurant assigned" },
        { status: 400 }
      );
    }

    const paymentStatus = isPaid ? "PAID" : "PENDING";
    const paymentMethodEnum = paymentMethod
      ? paymentMethod === "CARD"
        ? "CARD"
        : "CASH"
      : null;

    // 1. Find or create customer
    let customer = email
      ? await prisma.customer.findUnique({ where: { email } })
      : null;

    let customerId: number | null;

    if (email && !customer) {
      customer = await prisma.customer.create({
        data: {
          email,
          name: "Guest",
          isGuest: true,
          userId: null,
          totalSpent: 0,
          orderCount: 0,
        },
      });
    }

    customerId = customer?.id || null;

    // 2. Validate promo code (if provided)
    let promoCodeId: number | null = null;
    let discountAmount = 0;
    let promo: {
      id: number;
      discountPercent?: Decimal | null;
      discountAmount?: Decimal | null;
      maxUses?: number | null;
      maxUsesPerUser?: number | null;
    } | null = null;

    if (promoCode) {
      promo = await prisma.promoCode.findFirst({
        where: {
          code: promoCode,
          restaurantId,
          active: true,
          expiresAt: { gte: new Date() },
        },
        select: {
          id: true,
          discountPercent: true,
          discountAmount: true,
          maxUses: true,
          maxUsesPerUser: true,
        },
      });

      if (!promo) {
        return NextResponse.json(
          { error: "Invalid or expired promo code" },
          { status: 400 }
        );
      }

      // Check per-user limit
      if (promo.maxUsesPerUser && customerId) {
        const usageCount = await prisma.userPromoUsage.count({
          where: { customerId, promoCodeId: promo.id },
        });
        if (usageCount >= promo.maxUsesPerUser) {
          return NextResponse.json(
            {
              error: `You can only use this promo code ${promo.maxUsesPerUser} time(s)`,
            },
            { status: 400 }
          );
        }
      }

      promoCodeId = promo.id;
    }

    // 3. Calculate totalAmount from valid items
    let totalAmount = 0;
    const orderItemsData: {
      foodId: number;
      foodOptionId: number | null;
      quantity: number;
      price: number;
      notes: string | null;
    }[] = [];

    for (const item of items) {
      const food = await prisma.food.findUnique({
        where: { id: item.foodId, restaurantId },
      });

      if (!food) {
        return NextResponse.json(
          { error: `Food item ${item.foodId} not found` },
          { status: 404 }
        );
      }

      const option = item.foodOptionId
        ? await prisma.foodOption.findUnique({
            where: { id: item.foodOptionId, foodId: item.foodId },
          })
        : null;

      const unitPrice =
        Number(food.price) + (option ? Number(option.price) : 0);
      const lineTotal = unitPrice * item.quantity;
      totalAmount += lineTotal;

      orderItemsData.push({
        foodId: item.foodId,
        foodOptionId: item.foodOptionId || null,
        quantity: item.quantity,
        price: unitPrice,
        notes: item.notes || null,
      });
    }

    // Apply discount
    if (promo?.discountPercent) {
      discountAmount = (totalAmount * Number(promo.discountPercent)) / 100;
    } else if (promo?.discountAmount) {
      discountAmount = Number(promo.discountAmount);
    }
    discountAmount = Math.min(discountAmount, totalAmount);
    const finalAmount = Math.max(totalAmount - discountAmount, 0);

    // 4. Transaction: Create order, items, promo usage, update customer
    const order = await prisma.$transaction(async (tx) => {
      // Create customer if not exists
      if (!customerId) {
        const newCustomer = await tx.customer.create({
          data: {
            email: email || `guest-${Date.now()}@anon`,
            name: "Guest",
            isGuest: true,
            userId: null,
            totalSpent: 0,
            orderCount: 0,
          },
        });
        customerId = newCustomer.id;
      }

      // Increment promo usage (if valid)
      if (promoCodeId && promo && promo.maxUses !== null) {
        const updated = await tx.promoCode.updateMany({
          where: {
            id: promoCodeId,
            currentUses: { lt: promo.maxUses! },
          },
          data: { currentUses: { increment: 1 } },
        });
        if (updated.count === 0) {
          throw new Error("Promo code usage limit exceeded");
        }
      }

      // Create order
      const newOrder = await tx.order.create({
        data: {
          customerId,
          restaurantId,
          deliveryType,
          orderNote: orderNote || null,
          status: "PREPARING",
          totalAmount,
          finalAmount,
          discountAmount,
          promoCodeId: promoCodeId || null,
          createdById: session.user.id,
          paymentStatus,
          paymentMethod: paymentMethodEnum,
          items: {
            create: orderItemsData.map((item) => ({
              foodId: item.foodId,
              foodOptionId: item.foodOptionId,
              quantity: item.quantity,
              price: item.price,
              notes: item.notes,
            })),
          },
        },
      });

      // Create promo usage record
      if (promoCodeId) {
        await tx.userPromoUsage.create({
          data: {
            customerId,
            promoCodeId,
            orderId: newOrder.id,
          },
        });
      }

      // Update customer stats
      await tx.customer.update({
        where: { id: customerId },
        data: {
          totalSpent: { increment: finalAmount },
          orderCount: { increment: 1 },
        },
      });

      // Update table if DINEIN
      if (deliveryType === "DINEIN" && tableId) {
        await tx.table.update({
          where: { id: tableId, restaurantId },
          data: {
            currentOrder: { connect: { id: newOrder.id } },
            status: "OCCUPIED",
          },
        });
      }

      return newOrder;
    });

    return NextResponse.json({ success: true, order }, { status: 201 });
  } catch (error) {
    console.error("Waiter order creation error:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}
