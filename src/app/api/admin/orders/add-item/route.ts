// app/api/waiter/add-item/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (
      !session ||
      !["ADMIN", "WAITER", "KITCHEN"].includes(session.user.role)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { orderId, foodId, quantity, foodOptionId, notes } =
      await request.json();

    if (!orderId || !foodId || !quantity || quantity <= 0) {
      return NextResponse.json(
        { error: "Missing or invalid fields" },
        { status: 400 }
      );
    }

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

    const food = await prisma.food.findUnique({
      where: { id: foodId, restaurantId: order.restaurant.id },
    });

    if (!food) {
      return NextResponse.json({ error: "Food not found" }, { status: 404 });
    }

    const option = foodOptionId
      ? await prisma.foodOption.findUnique({
          where: { id: foodOptionId, foodId },
        })
      : null;

    const price = Number(food.price) + (option ? Number(option.price) : 0);

    const newItem = await prisma.orderItem.create({
      data: {
        orderId,
        foodId,
        foodOptionId: foodOptionId || null,
        quantity,
        price,
        notes: notes || null,
      },
    });

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        totalAmount: { increment: price * quantity },
        finalAmount: { increment: price * quantity },
      },
      include: {
        items: { include: { food: true, foodOption: true } },
        customer: { select: { name: true, email: true } },
        currentTableFor: { select: { number: true } },
      },
    });

    // 🔥 Pusher
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

    return NextResponse.json(updatedOrder, { status: 201 });
  } catch (error) {
    console.error("Add item failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
