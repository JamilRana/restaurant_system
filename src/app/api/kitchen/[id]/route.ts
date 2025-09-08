// app/api/kitchen/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/authOptions";
import { sendEmail } from "@/lib/notifications/email";
import Pusher from "pusher";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

const VALID_STATUSES = ["ACCEPTED", "PREPARING", "READY"] as const;
type OrderStatus = (typeof VALID_STATUSES)[number];

function isValidOrderStatus(status: string): status is OrderStatus {
  return VALID_STATUSES.includes(status as OrderStatus);
}

const canTransition = (from: string, to: string): boolean => {
  const transitions: Record<string, string[]> = {
    PLACED: ["ACCEPTED"],
    ACCEPTED: ["PREPARING"],
    PREPARING: ["READY"],
    READY: ["DELIVERED"],
    REJECTED: [],
    DELIVERED: [],
  };
  return (transitions[from] || []).includes(to);
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "KITCHEN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const orderId = parseInt(id, 10);
  if (isNaN(orderId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const { status } = await request.json();

  if (!status || !isValidOrderStatus(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { restaurant: true, customer: true },
    });

    if (!order)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (order.restaurant.id !== session.user.restaurantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (!canTransition(order.status, status)) {
      return NextResponse.json(
        { error: `Cannot go from ${order.status} to ${status}` },
        { status: 400 }
      );
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: {
        items: { include: { food: true } },
        customer: { select: { email: true, name: true } },
        createdBy: {
          select: { email: true, staff: { select: { name: true } } },
        },
      },
    });

    if (status === "READY" && order.customer.email) {
      await sendEmail({
        to: order.customer.email,
        subject: `Order #${orderId} Ready!`,
        text: `Hi ${order.customer.name}, your order is ready!`,
      });
    }

    await pusher.trigger(
      `restaurant-${order.restaurant.id}`,
      "order-updated",
      updatedOrder
    );

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error("PATCH /api/kitchen/[id]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
