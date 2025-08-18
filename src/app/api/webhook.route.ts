// app/api/webhook/route.ts
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Stripe } from "stripe";
import { prisma } from "@/lib/prisma"; // Your Prisma client

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-06-30.basil", // ✅ Now safe to use
});

export async function POST(req: Request) {
  let body = "";
  try {
    body = await req.text();
  } catch (err) {
    return NextResponse.json({ error: "Failed to read body" }, { status: 400 });
  }

  const heads = await headers(); // ✅ Await headers()
  const sig = heads.get("Stripe-Signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing Stripe-Signature" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { timeSlot, address, postcode, items, deliveryFee, customerId } = session.metadata || {};

    try {
      await prisma.order.create({
         data:{
          totalAmount: session.amount_total ? session.amount_total / 100 : 0,
          paymentStatus: "paid",
          status: "placed",
          timeSlot: timeSlot || null,
          paymentMethod: "card",
          deliveryType: "DELIVERY",
          address: address || null,
          postcode: postcode || null,
          customerId: customerId ? parseInt(customerId) : 1,
          restaurantId: 1,
          items: {
            create: JSON.parse(items || "[]").map((item: any) => ({
              foodId: item.foodId,
              quantity: item.quantity,
              price: item.price,
            })),
          },
        },
      });

      console.log("✅ Order saved via webhook:", session.id);
    } catch (err: any) {
      console.error("Failed to save order:", err);
      return NextResponse.json({ error: "DB save failed", details: err.message }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}