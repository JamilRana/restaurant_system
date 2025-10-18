// app/api/waiter/orders/[id]/pay/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/authOptions";
import { PaymentMethod, PaymentStatus, OrderStatus } from "@prisma/client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const orderId = parseInt(id, 10);

  if (isNaN(orderId)) {
    return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "WAITER", "KITCHEN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!session.user.restaurantId) {
    return NextResponse.json(
      { error: "No restaurant assigned" },
      { status: 400 }
    );
  }

  const { paymentMethod } = await request.json();

  // Validate payment method
  if (paymentMethod && !Object.values(PaymentMethod).includes(paymentMethod)) {
    return NextResponse.json(
      { error: "Invalid payment method" },
      { status: 400 }
    );
  }

  try {
    // ✅ FIXED: Include currentTableFor in the initial query
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        restaurant: true,
        currentTableFor: true, // ← ADD THIS
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.restaurantId !== session.user.restaurantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Update order to PAID
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: PaymentStatus.PAID,
        paymentMethod: paymentMethod || PaymentMethod.CARD,
        // Auto-complete dine-in orders when paid
        status:
          order.deliveryType === "DINEIN"
            ? OrderStatus.DELIVERED
            : order.status,
      },
      include: {
        customer: { select: { name: true, email: true } },
        items: {
          include: {
            food: { select: { name: true } },
            foodOption: { select: { name: true } },
          },
        },
        currentTableFor: { select: { number: true } },
      },
    });

    // ✅ FIXED: Now currentTableFor exists on 'order'
    if (order.deliveryType === "DINEIN" && order.currentTableFor) {
      await prisma.table.update({
        where: { id: order.currentTableFor.id },
        data: {
          status: "AVAILABLE",
          currentOrderId: null,
        },
      });
    }

    // Pusher notification (optional)
    try {
      const Pusher = require("pusher");
      const pusher = new Pusher({
        appId: process.env.PUSHER_APP_ID!,
        key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
        secret: process.env.PUSHER_SECRET!,
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        useTLS: true,
      });
      await pusher.trigger(
        `restaurant-${order.restaurantId}`,
        "order-updated",
        updatedOrder
      );
    } catch (err) {
      console.warn("Pusher failed:", err);
    }

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error("Payment update error:", error);
    return NextResponse.json(
      { error: "Failed to update payment status" },
      { status: 500 }
    );
  }
}
