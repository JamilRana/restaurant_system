// app/api/orders/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { OrderDetails, OrderItemWithFood, OrderWithItems } from "@/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const orderId = parseInt(id, 10);

  if (isNaN(orderId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
       items: {
        include: {
          food: {
              select: {
                id: true,
                name: true,
                description: true,
                image: true,
                price: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // ✅ Cast to correct type (or use Prisma types)
    const result: OrderDetails = {
      id: order.id,
      timeSlot: order.timeSlot,
      address: order.address,
      postcode: order.postcode,
      totalAmount: order.totalAmount,
      finalAmount:order.finalAmount,
      discountAmount: order.discountAmount,
      createdAt: order.createdAt,
      status: order.status,
      updatedAt:order.updatedAt,
      items: order.items.map((item:OrderItemWithFood) => ({
        id: item.id,
        quantity: item.quantity,
        price: item.price,
        food: {
          id: item.food.id,
          name: item.food.name,
          description: item.food.description,
          image: item.food.image,
          price: item.food.price,
        },
      }),
    ),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}