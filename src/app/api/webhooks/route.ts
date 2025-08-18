// app/api/webhook/route.ts
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Readable } from "stream";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-06-30.basil",
});

async function readBody(readable: Readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export async function POST(req: Request) {
  const sig = (await headers()).get("Stripe-Signature")!;
  const body = await readBody(req.body as any);

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("Webhook signature error:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const { metadata, customer_details, amount_total, id: sessionId } = session;

    try {
      // Prevent duplicate order
      const existingOrder = await prisma.order.findUnique({
        where: { stripeSessionId: sessionId },
      });

      if (existingOrder) {
        console.log("⚠️ Order already exists for session:", sessionId);
        return NextResponse.json({ received: true });
      }

      // Parse metadata
      const rawItems = metadata?.items;
      const timeSlot = metadata?.timeSlot || null;
      const address = metadata?.address || null;
      const postcode = metadata?.postcode || null;
      const deliveryMode = metadata?.deliveryMode;
      const deliveryFee = parseFloat(metadata?.deliveryFee || "0");

      let items = [];
      try {
        items = rawItems ? JSON.parse(rawItems) : [];
      } catch (e) {
        console.error("Failed to parse items", rawItems);
        return NextResponse.json({ error: "Invalid items" }, { status: 400 });
      }

      // Find customer by email
      const customer = await prisma.customer.findUnique({
        where: { email: customer_details?.email || "" },
      });

      if (!customer) {
        console.error("No customer found for email:", customer_details?.email);
        return NextResponse.json(
          { error: "Customer not found" },
          { status: 404 }
        );
      }

      // Determine restaurant (you may pass this in metadata if multiple)
      const restaurantId = 1; // Adjust if needed

      // Create order
      await prisma.order.create({
        data: {
          totalAmount: amount_total ? amount_total / 100 : 0,
          paymentStatus: "paid",
          status: "placed",
          timeSlot,
          paymentMethod: "card",
          deliveryType: deliveryMode === "collection" ? "PICKUP" : "DELIVERY",
          address,
          zipcode: postcode,
          customerId: customer.id,
          restaurantId,
          stripeSessionId: sessionId,
          stripeCustomerId: session.customer as string,
          items: {
            create: items.map((item: any) => ({
              foodId: item.foodId,
              quantity: item.quantity,
              price: item.price,
            })),
          },
        },
      });

      console.log("✅ Order created from webhook:", sessionId);
    } catch (err: any) {
      console.error("Failed to create order:", err);
      return NextResponse.json(
        { error: "Failed to process order" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ received: true });
}
