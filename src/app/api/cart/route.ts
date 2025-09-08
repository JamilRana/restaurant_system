// app/api/cart/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/authOptions";
import { Decimal } from "@prisma/client/runtime/library"; // ✅ Import Decimal type
import { prisma } from "@/lib/prisma";

interface OrderItemWithFood {
  id: number;
  quantity: number;
  price: Decimal; // ← Now matches Prisma
  food: {
    id: number;
    name: string;
    description: string | null;
    image: string | null;
  };
  foodOption: {
    name: string;
    price: Decimal; // ← Also Decimal if it has price
  } | null;
  foodOptionId: number | null;
}
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId } = await request.json();
  if (!orderId || !/^\d+$/.test(orderId.toString())) {
    return NextResponse.json(
      { error: "Valid Order ID is required" },
      { status: 400 }
    );
  }

  const orderNumber = parseInt(orderId, 10);

  try {
    const originalOrder = await prisma.order.findUnique({
      where: { id: orderNumber },
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

    // ✅ Map items and convert Decimal to number
    const basketItems = originalOrder.items.map((item: OrderItemWithFood) => ({
      id: item.food.id,
      name: item.food.name,
      description: item.food.description || "",
      image: item.food.image || "",
      quantity: item.quantity,
      price: item.price.toNumber(), // ✅ Correct way to convert Decimal → number
      option: item.foodOption
        ? {
            name: item.foodOption.name,
            price: item.foodOption.price.toNumber(), // ✅ Convert option price too
          }
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
      postcode: originalOrder.postcode,
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
