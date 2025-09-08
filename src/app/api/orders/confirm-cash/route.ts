// app/api/orders/confirm-cash/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/notifications/email";

type CartItem = {
  id: number;
  quantity: number;
  optionId: number | null;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("Received order data:", body);

    let discountAmount = parseFloat(body.discountAmount || "0");
    let totalAmount = parseFloat(body.totalAmount || "0");
    const deliveryFee = parseFloat(body.deliveryFee || "0");

    // 1. Validate required fields
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: "Order must include at least one item" },
        { status: 400 }
      );
    }

    if (!body.timeSlot) {
      return NextResponse.json(
        { error: "Time slot is required" },
        { status: 400 }
      );
    }

    if (body.deliveryType === "DELIVERY" && (!body.address || !body.postcode)) {
      return NextResponse.json(
        { error: "Address and postcode required for delivery" },
        { status: 400 }
      );
    }

    const restaurantId = 1;

    // 2. Validate and parse food items
    let items: CartItem[];
    try {
      items = body.items.map((item: any) => ({
        id: Number(item.id),
        quantity: Number(item.quantity),
        optionId: item.optionId ? Number(item.optionId) : null,
      }));

      if (items.some((item) => isNaN(item.id) || isNaN(item.quantity))) {
        return NextResponse.json(
          { error: "Invalid item data: ID and quantity must be numbers" },
          { status: 400 }
        );
      }
    } catch (err) {
      return NextResponse.json(
        { error: "Invalid items format" },
        { status: 400 }
      );
    }

    const itemFoodIds = items.map((item) => item.id);
    const availableFoods = await prisma.food.findMany({
      where: {
        id: { in: itemFoodIds },
        restaurantId,
        available: true,
      },
      select: { id: true, price: true },
    });

    const availableFoodIds = availableFoods.map((f) => f.id);
    const invalidIds = itemFoodIds.filter(
      (id) => !availableFoodIds.includes(id)
    );

    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: "Invalid food items", invalidIds },
        { status: 400 }
      );
    }

    const priceMap = Object.fromEntries(
      availableFoods.map((f) => [f.id, f.price])
    );

    // 3. Resolve customer FIRST (before promo checks)
    let customerId: number;

    if (body.isGuest) {
      if (!body.guestName || !body.guestEmail) {
        return NextResponse.json(
          { error: "Guest name and email are required" },
          { status: 400 }
        );
      }

      const customer = await prisma.customer.upsert({
        where: { email: body.guestEmail },
        update: {
          name: body.guestName,
          phone: body.Phone || null,
          totalSpent: { increment: totalAmount }, // Use totalAmount before discount
          orderCount: { increment: 1 },
        },
        create: {
          name: body.guestName,
          email: body.guestEmail,
          phone: body.Phone || null,
          totalSpent: totalAmount,
          orderCount: 1,
        },
      });

      customerId = customer.id;
    } else {
      const userWithCustomer = await prisma.user.findUnique({
        where: { id: body.customerId },
        include: { customer: true },
      });

      if (!userWithCustomer || !userWithCustomer.customer) {
        return NextResponse.json(
          { error: "Customer profile not found" },
          { status: 404 }
        );
      }

      await prisma.customer.update({
        where: { id: userWithCustomer.customer.id },
        data: {
          totalSpent: { increment: totalAmount },
          orderCount: { increment: 1 },
        },
      });

      customerId = userWithCustomer.customer.id;
    }

    // 4. Apply promo code (NOW safe to use customerId)
    let promoCodeId: number | null = null;
    let promo: any = null;

    if (body.promoCode) {
      promo = await prisma.promoCode.findFirst({
        where: {
          code: body.promoCode,
          restaurantId,
          active: true,
          expiresAt: { gte: new Date() },
        },
      });

      if (!promo) {
        return NextResponse.json(
          { error: "Invalid or expired promo code" },
          { status: 400 }
        );
      }

      // ✅ Now safe: customerId is defined
      if (promo.maxUsesPerUser) {
        const userUsageCount = await prisma.userPromoUsage.count({
          where: {
            customerId: customerId,
            promoCodeId: promo.id,
          },
        });

        if (userUsageCount >= promo.maxUsesPerUser) {
          return NextResponse.json(
            {
              error: `You can only use this promo code ${promo.maxUsesPerUser} time(s)`,
            },
            { status: 400 }
          );
        }
      }

      if (promo.discountPercent) {
        discountAmount = (totalAmount * Number(promo.discountPercent)) / 100;
      } else if (promo.discountAmount) {
        discountAmount = Number(promo.discountAmount);
      }
      discountAmount = Math.min(discountAmount, totalAmount);
      promoCodeId = promo.id;
    }

    const finalAmount = Math.max(totalAmount - discountAmount, 0);

    // 5. Create order + promo usage in transaction
    const order = await prisma.$transaction(async (tx) => {
      // ✅ Increment global usage (if maxUses exists)
      if (promoCodeId && promo && promo.maxUses !== null) {
        const updated = await tx.promoCode.updateMany({
          where: {
            id: promoCodeId,
            currentUses: { lt: promo.maxUses },
          },
          data: { currentUses: { increment: 1 } },
        });

        if (updated.count === 0) {
          throw new Error("Promo code usage limit exceeded");
        }
      }

      // ✅ Create the order
      const createdOrder = await tx.order.create({
        data: {
          totalAmount,
          finalAmount,
          discountAmount,
          promoCodeId,
          paymentStatus: body.paymentStatus || "PENDING",
          paymentMethod: body.paymentMethod || "CASH",
          status: body.status || "PLACED",
          timeSlot: body.timeSlot,
          deliveryType: body.deliveryType,
          address: body.address,
          postcode: body.postcode,
          orderNote: body.orderNote || null,
          customerId,
          restaurantId,
          expectedDeliveryTime: body.timeSlot
            ? new Date(Date.now() + 30 * 60 * 1000).toISOString()
            : null,
          stripeSessionId: body.stripeSessionId || null,
          stripePaymentIntent: body.stripePaymentIntent || null,
          items: {
            create: items.map((item) => ({
              foodId: item.id,
              quantity: item.quantity,
              price: priceMap[item.id],
              foodOptionId: item.optionId || null,
            })),
          },
        },
      });

      // ✅ Create usage record if promo was applied
      if (promoCodeId) {
        await tx.userPromoUsage.create({
          data: {
            customerId: customerId,
            promoCodeId: promoCodeId,
            orderId: createdOrder.id,
          },
        });
      }

      return createdOrder;
    });

    // 6. Send confirmation email (guest only)
    if (body.isGuest) {
      try {
        await sendEmail({
          to: body.guestEmail,
          subject: `Your Order #${order.id} is Confirmed!`,
          text: `
            <p>Hi <strong>${body.guestName}</strong>,</p>
            <p>Thank you for your order! 🎉</p>
            <p>Your order <strong>#${
              order.id
            }</strong> has been placed successfully.</p>
            <p><strong>Total:</strong> £${finalAmount.toFixed(2)}</p>
            <p>We'll notify you when it's ready!</p>
            <p>Thanks,<br/>The Restaurant Team</p>
          `,
        });
      } catch (err) {
        console.error("Failed to send email:", err);
      }
    }

    return NextResponse.json(
      { success: true, orderId: order.id },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Order creation failed:", error);
    return NextResponse.json(
      { error: "Failed to create order", details: error.message },
      { status: 500 }
    );
  }
}
