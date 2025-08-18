// app/api/waiter/orders/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import Pusher from "pusher";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

const VALID_STATUSES = ["accepted", "preparing", "ready", "delivered"] as const;
type OrderStatus = typeof VALID_STATUSES[number];

function isValidStatus(status: string): status is OrderStatus {
  return VALID_STATUSES.includes(status as OrderStatus);
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !["WAITER", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = params;
  const orderId = parseInt(id, 10);
  if (isNaN(orderId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const { status }: { status: string } = await request.json();

  if (!status || !isValidStatus(status)) {
    return NextResponse.json({ error: "Invalid or missing status" }, { status: 400 });
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

    // Prevent invalid transitions
    const allowedTransitions: Record<string, string[]> = {
      accepted: ["preparing", "ready", "delivered"],
      preparing: ["ready", "delivered"],
      ready: ["delivered"],
      delivered: [],
    };

    if (!allowedTransitions[order.status]?.includes(status)) {
      return NextResponse.json(
        { error: `Cannot transition from '${order.status}' to '${status}'` },
        { status: 400 }
      );
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
       data:{ status },
      include: {
        items: { include: { food: { include: { options: true } } } },
        table: { select: { number: true } },
        customer: { select: { name: true } },
      },
    });

    // 🚀 Real-time update
    await pusher.trigger(`restaurant-${order.restaurant.id}`, "order-updated", updatedOrder);

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error("PATCH /api/waiter/orders/[id]", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}