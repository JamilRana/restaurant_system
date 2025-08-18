import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/authOptions";
import { sendEmail } from "@/lib/notifications/email";
import Pusher from "pusher";

// Initialize Pusher for real-time
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

// Valid status transitions for kitchen
const VALID_STATUSES = ["accepted", "preparing", "ready"] as const;
type OrderStatus = (typeof VALID_STATUSES)[number];

function isValidOrderStatus(status: string): status is OrderStatus {
  return VALID_STATUSES.includes(status as OrderStatus);
}

// Status transition rules (prevent invalid flow)
const canTransition = (from: string, to: string): boolean => {
  const transitions: Record<string, string[]> = {
    placed: ["accepted"],
    accepted: ["preparing", "rejected"],
    preparing: ["ready"],
    ready: ["delivered"], // only delivery/cashier
    rejected: [],
    delivered: [],
  };
  return (transitions[from] || []).includes(to);
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "KITCHEN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const orderId = parseInt(id, 10);
  if (isNaN(orderId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const { status } = await request.json();

  if (!status || typeof status !== "string") {
    return NextResponse.json(
      { error: "Status is required and must be a string" },
      { status: 400 }
    );
  }

  if (!isValidOrderStatus(status)) {
    return NextResponse.json(
      { error: "Invalid status value" },
      { status: 400 }
    );
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { select: { email: true, name: true } },
        restaurant: { select: { id: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 🔒 Security: Ensure order belongs to same restaurant
    if (order.restaurant.id !== session.user.restaurantId) {
      return NextResponse.json(
        { error: "Unauthorized: Order not in your restaurant" },
        { status: 403 }
      );
    }

    // ⚠️ Optional: Validate status transition
    if (!canTransition(order.status, status)) {
      return NextResponse.json(
        { error: `Cannot transition from '${order.status}' to '${status}'` },
        { status: 400 }
      );
    }

    // Update order
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status,
      },
      include: {
        customer: { select: { email: true, name: true } },
        items: { include: { food: true } },
      },
    });

    // ✉️ Send email when order is ready
    if (status === "ready" && order.customer.email) {
      await sendEmail({
        to: order.customer.email,
        subject: `Your Order #${orderId} is Ready!`,
        text: `Hi ${
          order.customer.name
        }, your order is ready for ${order.deliveryType.toLowerCase()}!`,
        html: `
          <p>Hi <strong>${order.customer.name}</strong>,</p>
          <p>Your order #${orderId} is now <strong>ready</strong> for <strong>${order.deliveryType.toLowerCase()}</strong>.</p>
          <p>Thank you!</p>
        `,
      });
    }

    // 🚀 Trigger real-time update via Pusher
    await pusher.trigger(
      `restaurant-${order.restaurant.id}`,
      "order-updated",
      updatedOrder
    );

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error("PATCH /api/kitchen/[id]", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
