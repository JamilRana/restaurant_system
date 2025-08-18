// app/api/waiter/add-item/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import Pusher from "pusher";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

const AddItemSchema = z.object({
  orderId: z.coerce.number().int().positive(),
  foodId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().positive().default(1),
  foodOptionId: z.coerce.number().int().positive().nullable().optional(),
  notes: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !["WAITER", "ADMIN","KITCHEN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = await request.json();
  console.log("Raw add-item data:", data); // 🔥 Debug

  const parsed = AddItemSchema.safeParse(data);
  if (!parsed.success) {
    console.error("Validation error:", parsed.error.flatten());
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { orderId, foodId, quantity, foodOptionId, notes } = parsed.data;

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

    const food = await prisma.food.findUnique({
      where: { id: foodId, restaurantId: order.restaurant.id },
      include: { options: true },
    });

    if (!food) {
      return NextResponse.json({ error: "Food not found" }, { status: 404 });
    }

    if (foodOptionId) {
      const option = food.options.find(opt => opt.id === foodOptionId);
      if (!option) {
        return NextResponse.json({ error: "Invalid food option" }, { status: 400 });
      }
    }

    const optionPrice = foodOptionId
      ? food.options.find(o => o.id === foodOptionId)?.price || 0
      : 0;
    const price = food.price + optionPrice;

    const newItem = await prisma.orderItem.create({
       data:{
        orderId,
        foodId,
        quantity,
        notes:notes || null,
        price,
        foodOptionId: foodOptionId || null,
        addedAt: new Date(),
      },
    });

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
       data:{
        totalAmount: { increment: price * quantity },
        finalAmount: { increment: price * quantity },
      },
      include: {
        items: { include: { food: { include: { options: true } } } },
        table: { select: { number: true } },
        customer: { select: { name: true } },
      },
    });

    await pusher.trigger(`restaurant-${order.restaurant.id}`, "order-updated", updatedOrder);

    return NextResponse.json(updatedOrder, { status: 201 });
  } catch (error) {
    console.error("Add item failed:", error);
    return NextResponse.json({ error: "Failed to add item" }, { status: 500 });
  }
}