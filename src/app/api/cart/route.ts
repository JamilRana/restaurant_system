// app/api/cart/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "../auth/[...nextauth]/route";

// Define expected shape of item
interface OrderItemWithFood {
  id: number;
  quantity: number;
  price: number;
  food: {
    id: number;
    name: string;
    description: string | null;
    image: string | null;
  };
  foodOption: {
    name: string;
    price: number;
  } | null;
  foodOptionId: number | null;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId } = await request.json();

  if (!orderId) {
    return NextResponse.json({ error: "Order ID required" }, { status: 400 });
  }

  try {
    // Find the original order with items and food
    const originalOrder = await prisma.order.findUnique({
      where: { id: Number(orderId) }, // ✅ Ensure orderId is number
      include: {
        items: {
          include: {
            food: true,
            foodOption: true,
          },
        },
        restaurant: true,
      },
    });

    if (!originalOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // ✅ Map with typed parameter
    const basketItems = originalOrder.items.map((item: OrderItemWithFood) => ({
      id: item.food.id,
      name: item.food.name,
      description: item.food.description || "",
      price: item.price,
      image: item.food.image || "",
      quantity: item.quantity,
      option: item.foodOption
        ? { name: item.foodOption.name, price: item.foodOption.price }
        : undefined,
      optionId: item.foodOptionId || null,
    }));

    return NextResponse.json({
      message: "Order items loaded",
      items: basketItems,
      restaurantId: originalOrder.restaurantId,
      deliveryType: originalOrder.deliveryType,
      timeSlot: originalOrder.timeSlot,
      address: originalOrder.address,
      zipcode: originalOrder.zipcode,
      orderNote: originalOrder.orderNote,
    });
  } catch (error) {
    console.error("Error repeating order:", error);
    return NextResponse.json(
      { error: "Failed to load order items" },
      { status: 500 }
    );
  }
}