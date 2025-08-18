// app/api/orderlist/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/authOptions";
import { prisma } from "@/lib/prisma";
import type { OrderWithItems } from "@/types";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "5", 10);
  const status = searchParams.get("status");

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const customerId = session.user.id;

  const whereClause = {
    customerId,
    ...(status ? { status } : {}),
  };

  try {
    const [orders, count] = await Promise.all([
      prisma.order.findMany({
        where: whereClause,
        include: {
          restaurant: {
            select: {
              id: true,
              name: true,
              logoPath: true,
            },
          },
          items: {
            include: {
              food: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.order.count({ where: whereClause }),
    ]);

    // ✅ Now properly typed
    const formatted: Array<{
      id: number;
      totalAmount: number;
      status: string;
      createdAt: Date;
      restaurant: { id: number; name: string; logoPath: string | null };
      items: Array<{ name: string; qty: number; price: number }>;
    }> = orders.map((order: OrderWithItems) => ({
      id: order.id,
      totalAmount: order.totalAmount,
      status: order.status,
      createdAt: order.createdAt,
      restaurant: order.restaurant,
      items: order.items.map((item) => ({
        name: item.food.name,
        qty: item.quantity,
        price: item.price,
      })),
    }));

    return NextResponse.json({
      orders: formatted,
      totalPages: Math.ceil(count / limit),
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
