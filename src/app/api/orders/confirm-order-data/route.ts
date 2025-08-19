// app/api/confirm-order/route.ts
import { NextResponse } from "next/server";
import { Stripe } from "stripe";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-06-30.basil",
});

export async function POST(request: Request) {
  try {
    const body = await request.text(); // Log raw body
    console.log("Raw request body:", body);

    const { sessionId } = JSON.parse(body);

    if (!sessionId) {
      console.error("No sessionId provided");
      return NextResponse.json(
        { error: "Missing session_id" },
        { status: 400 }
      );
    }

    let session;
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["payment_intent"],
      });
    } catch (err: any) {
      console.error("Stripe session retrieval failed:", err.message);
      return NextResponse.json(
        { error: `Stripe error: ${err.message}` },
        { status: 400 }
      );
    }

    if (session.payment_status !== "paid") {
      console.warn("Payment not completed:", session.payment_status);
      return NextResponse.json(
        { error: "Payment not completed" },
        { status: 400 }
      );
    }

    const metadata = session.metadata || {};
    const rawDeliveryType = metadata.deliveryType;
    if (!["PICKUP", "DELIVERY", "DINEIN"].includes(rawDeliveryType)) {
      console.error("Invalid deliveryType:", rawDeliveryType);
      return NextResponse.json(
        { error: "Invalid delivery type" },
        { status: 400 }
      );
    }
    console.log("Stripe metadata:", metadata); // 🔍 Debug

    // Validate required metadata
    if (!metadata.customerId || !metadata.restaurantId) {
      console.error("Missing required metadata:", metadata);
      return NextResponse.json(
        { error: "Incomplete order data" },
        { status: 400 }
      );
    }

    // Parse items
    let items = [];
    try {
      items = JSON.parse(metadata.items || "[]");
      if (!Array.isArray(items) || items.length === 0) {
        throw new Error("Invalid items");
      }
    } catch (err) {
      console.error("Failed to parse items:", metadata.items);
      return NextResponse.json(
        { error: "Invalid order items" },
        { status: 400 }
      );
    }

    // Recalculate
    const itemTotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const deliveryFee = parseFloat(metadata.deliveryFee || "0");
    const discountAmount = parseFloat(metadata.discountAmount || "0");
    const totalAmount = itemTotal + deliveryFee;
    const finalAmount = Math.max(totalAmount - discountAmount, 0);

    // Resolve customer
    let customerId: number;

    if (metadata.isGuestOrder === "true") {
      const customer = await prisma.customer.upsert({
        where: { email: metadata.guestEmail },
        update: {
          name: metadata.guestName,
          totalSpent: { increment: finalAmount },
          orderCount: { increment: 1 },
        },
        create: {
          name: metadata.guestName,
          email: metadata.guestEmail,
          totalSpent: finalAmount,
          orderCount: 1,
        },
      });
      customerId = parseInt(metadata.customerId);
      if (isNaN(customerId)) {
        return NextResponse.json(
          { error: "Invalid customerId" },
          { status: 400 }
        );
      }
    } else {
      // const customer = await prisma.customer.findUnique({
      //   where: { id: parseInt(data.customerId) },
      // });
      const userWithCustomer = await prisma.user.findUnique({
        where: { id: parseInt(metadata.customerId) },
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

    // Create order
    const order = await prisma.order.create({
      data: {
        totalAmount,
        finalAmount,
        discountAmount,
        promoCode: metadata.promoCode || null,
        paymentStatus: "paid",
        paymentMethod: "card",
        status: "placed",
        timeSlot: metadata.timeSlot,
        deliveryType: rawDeliveryType as any,
        address: metadata.address,
        postcode: metadata.postcode,
        orderNote: metadata.orderNote || null,
        customerId,
        restaurantId: parseInt(metadata.restaurantId),
        isGuestOrder: metadata.isGuestOrder === "true",
        guestName: metadata.isGuestOrder === "true" ? metadata.guestName : null,
        guestEmail:
          metadata.isGuestOrder === "true" ? metadata.guestEmail : null,
        stripeSessionId: session.id,
        stripePaymentIntent: session.payment_intent
          ? typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent.id
          : null,
        items: {
          create: items.map((item: any) => ({
            foodId: item.id,
            quantity: item.quantity,
            price: item.price,
            foodOptionId: item.optionId || null,
          })),
        },
      },
    });

    return NextResponse.json({ success: true, orderId: order.id });
  } catch (error: any) {
    console.error("❌ FULL ERROR in /api/confirm-order:", error);
    return NextResponse.json(
      {
        error: "Failed to save order",
        details: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
