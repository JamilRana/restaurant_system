// app/api/orderlist/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "../../../lib/authOptions";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const role = searchParams.get("role");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const status = searchParams.get("status"); // ✅ Get status filter

  if (!id) {
    return NextResponse.json({ error: "User ID required" }, { status: 400 });
  }

  let whereClause: any = {};

  // Customer sees only their orders
  if (role === "CUSTOMER") {
    whereClause.customer = {
      user: { id: session.user.id },
    };
  }

  // Apply status filter
  if (status) {
    whereClause.status = status;
  }

  try {
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: whereClause,
        include: {
          restaurant: { select: { name: true, id: true } },
          items: { include: { food: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.order.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      orders,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
