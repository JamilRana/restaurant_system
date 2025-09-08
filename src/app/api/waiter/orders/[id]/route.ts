// app/api/waiter/orders/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const orderId = parseInt(id, 10);
  if (isNaN(orderId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "WAITER", "KITCHEN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { status } = await request.json();

  if (
    !status ||
    !["ACCEPTED", "PREPARING", "READY", "DELIVERED", "REJECTED"].includes(
      status
    )
  ) {
    return NextResponse.json(
      { error: "Invalid or missing status" },
      { status: 400 }
    );
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { restaurant: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.restaurant.id !== session.user.restaurantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status,
      },
      include: {
        items: { include: { food: true, foodOption: true } },
        customer: { select: { name: true, email: true } },
        currentTableFor: { select: { number: true } },
      },
    });

    // 🔥 Pusher: Broadcast
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
        `restaurant-${order.restaurant.id}`,
        "order-updated",
        updatedOrder
      );
    } catch (err) {
      console.warn("Pusher trigger failed:", err);
    }

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error("Update order status failed:", error);
    return NextResponse.json(
      { error: "Failed to update status" },
      { status: 500 }
    );
  }
}
