// app/api/checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Stripe } from "stripe";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/authOptions";

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
      deliveryType,
      orderNote,
      promoCode,
      isGuest,
      Name,
      Email,
      Phone,
    } = body;

    console.log("Processing checkout:", body);

    // Validation
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 });
    }
    if (!timeSlot) {
      return NextResponse.json(
        { error: "Time slot is required" },
        { status: 400 }
      );
    }
    if (deliveryType === "DELIVERY" && (!address || !postcode)) {
      return NextResponse.json(
        { error: "Address and postcode required for delivery" },
        { status: 400 }
      );
    }

    let userId: number | null = null;
    let customerId: number;
    let restaurantId = 1;

    // Handle guest vs logged-in
    if (isGuest) {
      if (!Name || !Email || !Phone) {
        return NextResponse.json(
          { error: "Guest name, email, and phone are required" },
          { status: 400 }
        );
      }

      const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(Email);
      if (!isValidEmail) {
        return NextResponse.json(
          { error: "Invalid email address" },
          { status: 400 }
        );
      }

      const customer = await prisma.customer.upsert({
        where: { email: Email },
        update: { name: Name, phone: Phone },
        create: { name: Name, email: Email, phone: Phone, isGuest: true },
      });

      customerId = customer.id;
    } else {
      // Logged-in user
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      userId = session.user.id;

      const userWithCustomer = await prisma.user.findUnique({
        where: { id: userId },
        include: { customer: true, restaurant: true },
      });

      if (!userWithCustomer || !userWithCustomer.customer) {
        return NextResponse.json(
          { error: "Customer profile not found" },
          { status: 404 }
        );
      }

      customerId = userWithCustomer.customer.id;
      restaurantId = userWithCustomer.restaurant?.id || 1; // Optional: assign per user
    }

    // Calculate totals
    const itemTotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const delivery = deliveryType === "DELIVERY" ? deliveryFee : 0;
    const subtotal = itemTotal + delivery;

    // Apply promo
    let discountAmount = 0;
    if (promoCode) {
      const promo = await prisma.promoCode.findFirst({
        where: {
          code: promoCode.trim().toUpperCase(),
          restaurantId,
          active: true,
          expiresAt: { gte: new Date() },
        },
      });

      if (promo && promo.currentUses < (promo.maxUses || Infinity)) {
        if (promo.discountPercent) {
          discountAmount = (subtotal * Number(promo.discountPercent)) / 100;
        } else if (promo.discountAmount) {
          discountAmount = Number(promo.discountAmount);
        }
        discountAmount = Math.min(discountAmount, subtotal); // Prevent over-discount
      }
    }

    const finalAmount = Math.max(subtotal - discountAmount, 0);

    // 👉 Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: { name: "Order Payment" },
            unit_amount: Math.round(finalAmount * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${req.nextUrl.origin}/order-status?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${req.nextUrl.origin}/checkout?canceled=true`,
      metadata: {
        // ✅ Send userId only for logged-in users
        ...(userId && { userId: userId.toString() }),

        // Always send these
        isGuestOrder: isGuest.toString(),
        customerId: customerId.toString(),
        restaurantId: restaurantId.toString(),
        ...(isGuest && {
          Name: String(Name),
          Email: String(Email),
          Phone: String(Phone),
        }),

        // Order data
        items: JSON.stringify(items),
        timeSlot,
        deliveryType,
        address,
        postcode,
        orderNote,
        promoCode,
        finalAmount: finalAmount.toFixed(2),
        discountAmount: discountAmount.toFixed(2),
        totalAmount: subtotal.toFixed(2),
      },
      payment_intent_data: {
        receipt_email: Email,
      },
    });

    console.log("Stripe session created:", {
      id: session.id,
      url: session.url,
    });
    return NextResponse.json({
      url: session.url,
      customer: { isGuest: isGuest, phone: Phone, email: Email },
    });
  } catch (error: any) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create payment session", details: error.message },
      { status: 500 }
    );
  }
}
