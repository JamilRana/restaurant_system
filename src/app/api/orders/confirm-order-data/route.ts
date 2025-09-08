// app/api/orders/confirm-order-data/route.ts
import { NextResponse } from "next/server";
import { Stripe } from "stripe";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-06-30.basil",
});

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const { sessionId }: { sessionId?: string } = JSON.parse(body);

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing session_id" },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"],
    });

    if (session.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Payment not completed" },
        { status: 400 }
      );
    }

    const metadata = session.metadata || {};
    console.log("Stripe session metadata:", metadata);

    // Parse amounts
    const finalAmount = parseFloat(metadata.finalAmount || "0");
    const discountAmount = parseFloat(metadata.discountAmount || "0");
    const totalAmount = parseFloat(metadata.totalAmount || "0");

    if (isNaN(finalAmount) || isNaN(discountAmount) || isNaN(totalAmount)) {
      return NextResponse.json(
        { error: "Invalid order amounts" },
        { status: 400 }
      );
    }

    const restaurantId = parseInt(metadata.restaurantId) || 1;

    // Resolve customer
    let customerId: number;

    if (metadata.isGuestOrder === "true") {
      if (!metadata.Name || !metadata.Email) {
        return NextResponse.json(
          { error: "Guest name and email are required" },
          { status: 400 }
        );
      }

      const customer = await prisma.customer.upsert({
        where: { email: metadata.Email },
        update: {
          name: metadata.Name,
          phone: metadata.Phone || null,
          totalSpent: { increment: finalAmount },
          orderCount: { increment: 1 },
        },
        create: {
          name: metadata.Name,
          email: metadata.Email,
          phone: metadata.Phone || null,
          isGuest: true,
          totalSpent: finalAmount,
          orderCount: 1,
        },
      });

      customerId = customer.id;
    } else {
      const userId = parseInt(metadata.userId);
      if (isNaN(userId)) {
        return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
      }

      const userWithCustomer = await prisma.user.findUnique({
        where: { id: userId },
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
          totalSpent: { increment: finalAmount },
          orderCount: { increment: 1 },
        },
      });

      customerId = userWithCustomer.customer.id;
    }

    // ✅ Idempotency: Check if order already exists
    const existingOrder = await prisma.order.findUnique({
      where: { stripeSessionId: session.id },
    });

    if (existingOrder) {
      console.log("Order already exists:", existingOrder.id);
      return NextResponse.json({
        success: true,
        orderId: existingOrder.id,
        customer: {
          isGuest: metadata.isGuestOrder === "true",
          phone: metadata.Phone || null,
          email: metadata.Email || null,
        },
      });
    }

    // Parse items
    let items;
    try {
      items = JSON.parse(metadata.items).map((item: any) => ({
        id: Number(item.id),
        quantity: Number(item.quantity),
        optionId: item.optionId ? Number(item.optionId) : null,
      }));
    } catch {
      return NextResponse.json({ error: "Invalid item data" }, { status: 400 });
    }

    const foodIds = items.map((i: any) => i.id);
    const foods = await prisma.food.findMany({
      where: {
        id: { in: foodIds },
        restaurantId,
        available: true,
      },
      select: { id: true, price: true },
    });

    const priceMap = Object.fromEntries(foods.map((f) => [f.id, f.price]));
    const invalidIds = foodIds.filter(
      (id: number) => !foods.some((f) => f.id === id)
    );

    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: "Invalid food items", invalidIds },
        { status: 400 }
      );
    }

    // Lookup promo code
    let promoCodeId: number | null = null;
    if (metadata.promoCode) {
      const promo = await prisma.promoCode.findFirst({
        where: {
          code: metadata.promoCode,
          restaurantId,
          active: true,
          expiresAt: { gte: new Date() },
        },
        select: { id: true },
      });

      if (promo) {
        promoCodeId = promo.id;
      }
    }

    // ✅ Create order and promo usage in a single transaction
    const order = await prisma.$transaction(async (tx) => {
      // Re-check for existing order inside transaction
      const existing = await tx.order.findUnique({
        where: { stripeSessionId: session.id },
      });

      if (existing) {
        return existing;
      }

      // Create the order
      const createdOrder = await tx.order.create({
        data: {
          totalAmount,
          finalAmount,
          discountAmount,
          promoCodeId,
          paymentStatus: "PAID",
          paymentMethod: "CARD",
          status: "PLACED",
          deliveryType: metadata.deliveryType as any,
          timeSlot: metadata.timeSlot || null,
          address: metadata.address || null,
          postcode: metadata.postcode || null,
          orderNote: metadata.orderNote || null,
          customerId,
          restaurantId,
          stripeSessionId: session.id,
          stripePaymentIntent:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent?.id || null,
          items: {
            create: items.map((item: any) => ({
              foodId: item.id,
              quantity: item.quantity,
              price: priceMap[item.id],
              foodOptionId: item.optionId || null,
            })),
          },
        },
      });

      // ✅ Record promo usage if applicable
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

    return NextResponse.json({
      success: true,
      orderId: order.id,
      customer: {
        isGuest: metadata.isGuestOrder === "true",
        phone: metadata.Phone || null,
        email: metadata.Email || null,
      },
    });
  } catch (error: any) {
    console.error("Order creation failed:", error);
    return NextResponse.json(
      { error: "Failed to save order", details: error.message },
      { status: 500 }
    );
  }
}
