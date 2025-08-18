// app/api/orders/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    console.log("api called");
    const data = await request.json();
    // 1. Validate required fields
    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
      return NextResponse.json(
        { error: "Order must include at least one item" },
        { status: 400 }
      );
    }
    if (!data.timeSlot) {
      return NextResponse.json(
        { error: "Time slot is required" },
        { status: 400 }
      );
    }
    if (data.deliveryType === "DELIVERY" && (!data.address || !data.postcode)) {
      return NextResponse.json(
        { error: "Address and postcode required for delivery" },
        { status: 400 }
      );
    }

    // 2. Recalculate total server-side
    const itemTotal = data.items.reduce(
      (sum: number, item: any) => sum + item.price * item.quantity,
      0
    );
    const deliveryFee = data.deliveryFee ? Number(data.deliveryFee) : 0;
    let totalAmount = itemTotal + deliveryFee;

    // 3. Apply promo code if provided
    let discountAmount = 0;
    let appliedPromoCode = null;

    if (data.promoCode) {
      const promo = await prisma.promoCode.findFirst({
        where: {
          code: data.promoCode.toUpperCase(),
          active: true,
          restaurantId: data.restaurantId,
          expiresAt: { gte: new Date() },
          minOrderAmount: { lte: totalAmount },
        },
      });

      if (!promo) {
        return NextResponse.json(
          { error: "Invalid or expired promo code" },
          { status: 400 }
        );
      }

      if (promo.discountPercent) {
        discountAmount = (totalAmount * promo.discountPercent) / 100;
      } else if (promo.discountAmount) {
        discountAmount = promo.discountAmount;
      }

      discountAmount = Math.min(discountAmount, totalAmount);
      appliedPromoCode = promo.code;
      

    await prisma.promoCode.update({
  where: { id: promo.id },
  data: { currentUses: { increment: 1 } },
});
    }

    const finalAmount = Math.max(totalAmount - discountAmount, 0);

    // 4. Resolve customer: guest or logged-in
    let customerId: number;
if (data.isGuestOrder === true || data.isGuestOrder === "true") {
      const customer = await prisma.customer.upsert({
        where: { email: data.guestEmail },
        update: {
          name: data.guestName,
          totalSpent: { increment: finalAmount },
          orderCount: { increment: 1 },
        },
        create: {
          name: data.guestName,
          email: data.guestEmail,
          totalSpent: finalAmount,
          orderCount: 1,
        },
      });
      customerId = parseInt(data.customerId);
if (isNaN(customerId)) {
  return NextResponse.json({ error: "Invalid customerId" }, { status: 400 });
}
    } else {
      // const customer = await prisma.customer.findUnique({
      //   where: { id: parseInt(data.customerId) },
      // });
       const userWithCustomer = await prisma.user.findUnique({
    where: { id: parseInt(data.customerId) },
    include: { customer: true },
  });

  if (!userWithCustomer || !userWithCustomer.customer) {
    return NextResponse.json(
      { error: "Customer profile not found. Please contact support." },
      { status: 404 }
    );
  }

  const actualCustomerId = userWithCustomer.customer.id; // ✅ This is the real Customer ID

  // ✅ Update the Customer using the Customer ID
  await prisma.customer.update({
    where: { id: actualCustomerId },
    data: {
      totalSpent: { increment: finalAmount },
      orderCount: { increment: 1 },
    },
  });

  customerId = actualCustomerId;

    }


    // 5. Create the order — now with Stripe fields

;
const order = await prisma.order.create({
  data: {
    totalAmount,
    finalAmount,
    discountAmount,
    promoCode: appliedPromoCode,
    paymentStatus: data.paymentStatus || "pending",
    paymentMethod: data.paymentMethod || "cash",
    status: data.status || "placed",
    timeSlot: data.timeSlot,
    deliveryType: data.deliveryType,
    address: data.address,
    postcode: data.postcode,
    orderNote: data.orderNote || null,
    expectedDeliveryTime: data.timeSlot
      ? new Date(Date.now() + 30 * 60 * 1000).toISOString()
      : null,
    customerId,
    restaurantId: data.restaurantId,
    isGuestOrder: data.isGuestOrder || false,
    guestName: data.isGuestOrder ? data.guestName : null,
    guestEmail: data.isGuestOrder ? data.guestEmail : null,
    stripeSessionId: data.stripeSessionId || null,
    stripePaymentIntent: data.stripePaymentIntent || null,
    items: {
      create: data.items.map((item: any) => ({
        foodId: item.foodId,
        quantity: item.quantity,
        price: item.price,
        foodOptionId: item.foodOptionId || null,
      })),
    },
  },
  include: {
    items: { include: { food: true } },
  },
});

    return NextResponse.json(
      { success: true, orderId: order.id, finalAmount },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { error: "Failed to create order", details: error.message },
      { status: 500 }
    );
  }
}