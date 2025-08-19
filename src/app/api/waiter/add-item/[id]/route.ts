// app/api/waiter/add-item/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import Pusher from "pusher";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const itemId = parseInt(id, 10);
  if (isNaN(itemId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  if (!session || !["WAITER", "ADMIN", "KITCHEN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const item = await prisma.orderItem.findUnique({
    where: { id: itemId },
    include: { order: { include: { restaurant: true } } },
  });

  if (!item)
    return NextResponse.json({ error: "Item not found" }, { status: 404 });

  if (item.order.restaurant.id !== session.user.restaurantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { quantity, foodOptionId, notes } = await request.json();

  try {
    await prisma.orderItem.update({
      where: { id: itemId },
      data: {
        quantity: quantity || 1,
        foodOptionId: foodOptionId || null,
      },
    });

    const order = await prisma.order.update({
      where: { id: item.orderId },
      data: {},
      include: {
        items: { include: { food: { include: { options: true } } } },
        table: { select: { number: true } },
        customer: { select: { name: true } },
      },
    });

    await pusher.trigger(
      `restaurant-${order.restaurantId}`,
      "order-updated",
      order
    );

    return NextResponse.json(order);
  } catch (error) {
    console.error("Edit order item failed:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // ✅ Now a Promise
) {
  const { id } = await params; // ✅ Await it
  const itemId = parseInt(id, 10);
  if (isNaN(itemId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  if (!session || !["WAITER", "ADMIN", "KITCHEN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const item = await prisma.orderItem.findUnique({
    where: { id: itemId },
    include: { order: { include: { restaurant: true } } },
  });

  if (!item)
    return NextResponse.json({ error: "Item not found" }, { status: 404 });

  if (item.order.restaurant.id !== session.user.restaurantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    await prisma.orderItem.delete({ where: { id: itemId } });

    const order = await prisma.order.update({
      where: { id: item.orderId },
      data: {},
      include: {
        items: { include: { food: { include: { options: true } } } },
        table: { select: { number: true } },
        customer: { select: { name: true } },
      },
    });

    await pusher.trigger(
      `restaurant-${order.restaurantId}`,
      "order-updated",
      order
    );

    return NextResponse.json(order);
  } catch (error) {
    console.error("Delete order item failed:", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
