// app/api/waiter/add-item/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { triggerPusher } from "@/lib/utils"; // Optional: move trigger to utils
import Pusher from "pusher";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const itemId = parseInt(id, 10);
  if (isNaN(itemId))
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "WAITER", "KITCHEN"].includes(session.user.role)) {
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

  const { quantity, foodOptionId, notes } = await req.json();

  try {
    await prisma.orderItem.update({
      where: { id: itemId },
      data: {
        quantity: quantity || 1,
        foodOptionId: foodOptionId || null,
        notes: notes || null,
      },
    });

    const order = await prisma.order.update({
      where: { id: item.orderId },
      data: {},
      include: {
        items: { include: { food: { include: { options: true } } } },
        currentTableFor: { select: { number: true } },
        customer: { select: { name: true } },
      },
    });
    return NextResponse.json(order);
  } catch (error) {
    console.error("Edit order item failed:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const itemID = parseInt(id, 10);
  if (isNaN(itemID)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "WAITER", "KITCHEN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const item = await prisma.orderItem.findUnique({
    where: { id: itemID },
    include: { order: { include: { restaurant: true } } },
  });

  if (!item)
    return NextResponse.json({ error: "Item not found" }, { status: 404 });

  if (item.order.restaurant.id !== session.user.restaurantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const itemPrice = Number(item.price);
    const lineTotal = itemPrice * item.quantity;

    await prisma.orderItem.delete({ where: { id: itemID } });

    const updatedOrder = await prisma.order.update({
      where: { id: item.orderId },
      data: {
        totalAmount: { decrement: lineTotal },
        finalAmount: { decrement: lineTotal },
      },
      include: {
        items: { include: { food: true, foodOption: true } },
        customer: { select: { name: true, email: true } },
        currentTableFor: { select: { number: true } },
      },
    });

    await triggerPusher(
      `restaurant-${item.order.restaurant.id}`,
      "order-updated",
      updatedOrder
    );

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error("Delete item failed:", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
