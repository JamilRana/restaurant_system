// app/api/checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Stripe } from "stripe";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-06-30.basil",
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      items,
      deliveryFee,
      timeSlot,
      address,
      postcode,
      deliveryMode,
      orderNote,
      promoCode,
      isGuestOrder,
      guestName,
      guestEmail,
    } = body;

    // Validation
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 });
    }
    if (!timeSlot) {
      return NextResponse.json({ error: "Time slot is required" }, { status: 400 });
    }
    if (deliveryMode === "delivery" && (!address || !postcode)) {
      return NextResponse.json(
        { error: "Address and postcode required for delivery" },
        { status: 400 }
      );
    }

    let customerId: number;
    let restaurantId = 1;

    // Handle guest or logged-in
    if (isGuestOrder) {
      const customer = await prisma.customer.upsert({
        where: { email: guestEmail },
        update: {},
        create: {
          name: guestName,
          email: guestEmail,
        },
      });
      customerId = customer.id;
    } else {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { customer: true },
      });

      if (!user || !user.customer) {
        return NextResponse.json({ error: "Customer not found" }, { status: 404 });
      }

      customerId = user.customer.id;
      restaurantId = session.user.restaurantId || 1;
    }

    // Calculate total
    const itemTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const delivery = deliveryMode === "delivery" ? deliveryFee : 0;
    const totalAmount = itemTotal + delivery;

    // Promo code
    let discountAmount = 0;
    if (promoCode) {
      const promo = await prisma.promoCode.findFirst({
        where: {
          code: promoCode.toUpperCase(),
          active: true,
          restaurantId,
          expiresAt: { gte: new Date() },
          minOrderAmount: { lte: totalAmount },
        },
      });

      if (promo) {
        discountAmount = promo.discountPercent
          ? (totalAmount * promo.discountPercent) / 100
          : promo.discountAmount || 0;
        discountAmount = Math.min(discountAmount, totalAmount);
      }
    }

    const finalAmount = Math.max(totalAmount - discountAmount, 0);

    // Prepare line items for Stripe
    const lineItems = [
      ...items.map((item) => ({
        price_data: {
          currency: "gbp",
          product_data: { name: item.name },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      })),
      ...(deliveryMode === "delivery" && deliveryFee > 0
        ? [
            {
              price_data: {
                currency: "gbp",
                product_data: { name: "Delivery Fee" },
                unit_amount: Math.round(deliveryFee * 100),
              },
              quantity: 1,
            },
          ]
        : []),
      ...(discountAmount > 0
        ? [
            {
              price_data: {
                currency: "gbp",
                product_data: { name: "Discount" },
                unit_amount: Math.round(-discountAmount * 100),
              },
              quantity: 1,
            },
          ]
        : []),
    ];

    // Create Stripe session
// Inside POST handler
const checkoutSession = await stripe.checkout.sessions.create({
  payment_method_types: ["card"],
  mode: "payment",
  line_items: lineItems,
  success_url: `${req.nextUrl.origin}/order-status?session_id={CHECKOUT_SESSION_ID}&success=true`,
  cancel_url: `${req.nextUrl.origin}/Checkout?canceled=true`,
  metadata: {
  items: JSON.stringify(items),
  deliveryFee: deliveryFee.toString(),
  timeSlot,
  address,
  postcode,
  deliveryMode,
  orderNote,
  promoCode,
  isGuestOrder: isGuestOrder.toString(),
  guestName,
  guestEmail,
  customerId: customerId.toString(),
  restaurantId: restaurantId.toString(),
  finalAmount: finalAmount.toString(),
  paymentStatus: "paid",
  paymentMethod: "card",
  deliveryType: deliveryMode === "delivery" ? "DELIVERY" : "PICKUP",
  status: "placed",
}
});

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error: any) {
    console.error("Stripe session error:", error);
    return NextResponse.json(
      { error: "Failed to create payment session" },
      { status: 500 }
    );
  }
}