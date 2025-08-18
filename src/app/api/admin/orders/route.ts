// app/api/admin/orders/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "../../../../lib/authOptions";

// app/api/admin/orders/route.ts
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !["ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const status = searchParams.get("status") || "";
  const search = searchParams.get("search") || "";
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  let whereClause: any = {};

  if (status) whereClause.status = status;

  if (search) {
    whereClause.OR = [
      {
        id: {
          equals: parseInt(search),
        },
      },
      { customer: { name: { contains: search, mode: "insensitive" } } },
    ];
  }
  if (startDate || endDate) {
    whereClause.createdAt = {};
    if (startDate) whereClause.createdAt.gte = new Date(startDate);
    if (endDate) whereClause.createdAt.lte = new Date(endDate);
  }

  try {
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: whereClause,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          customer: { select: { name: true, email: true, phone: true } },
          items: { include: { food: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.order.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      orders,
      totalCount: total, // ✅ Fixed: was `totalCount`
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error("Failed to fetch admin orders:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
