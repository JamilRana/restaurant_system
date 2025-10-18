// app/api/admin/orders/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "../../../../lib/authOptions";

// app/api/admin/orders/route.ts
// app/api/admin/orders/route.ts
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const restaurantId = session.user.restaurantId;
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const status = searchParams.get("status") || "";
  const search = searchParams.get("search") || "";
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  if (!restaurantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let whereClause: any = { restaurantId };

  if (status) whereClause.status = status;

  if (search) {
    const searchAsNum = parseInt(search);
    whereClause.OR = [
      !isNaN(searchAsNum) ? { id: { equals: searchAsNum } } : undefined,
      { customer: { name: { contains: search, mode: "insensitive" } } },
      { customer: { email: { contains: search, mode: "insensitive" } } },
    ].filter(Boolean);
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
          currentTableFor: { select: { number: true } },
          items: { include: { food: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.order.count({ where: whereClause }),
    ]);

    // ✅ Calculate status distribution from the same filtered set
    const statusDistribution = await prisma.order.groupBy({
      by: ["status"],
      _count: { _all: true },
      where: whereClause,
    });

    const statusMap = statusDistribution.reduce((acc, group) => {
      acc[group.status] = group._count._all;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      orders,
      totalCount: total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      statusDistribution: statusMap, // ✅ Now reflects current filters
    });
  } catch (error) {
    console.error("Failed to fetch admin orders:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
