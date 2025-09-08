// app/api/kitchen/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/authOptions";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  // Check authentication
  if (!session || !["KITCHEN", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const restaurantId = session.user.restaurantId;
  if (!restaurantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "10", 10);
  const statusFilter = searchParams.get("status") || "";
  const search = searchParams.get("search") || "";

  // Define valid statuses
  const validStatuses = ["ACCEPTED", "PREPARING", "READY"];

  // Normalize filter
  const normalizedStatus = statusFilter.toUpperCase();

  // Base where clause
  const whereClause: any = {
    restaurantId,
    status: { in: validStatuses },
  };

  // Filter by status
  if (normalizedStatus && validStatuses.includes(normalizedStatus as any)) {
    whereClause.status = normalizedStatus;
  }

  // Search
  if (search) {
    const searchInt = parseInt(search);
    whereClause.OR = [
      isNaN(searchInt) ? undefined : { id: { equals: searchInt } },
      { customer: { name: { contains: search, mode: "insensitive" } } },
    ].filter(Boolean);
  }

  try {
    // Fetch orders, total count, and grouped counts
    const [orders, total, counts] = await Promise.all([
      prisma.order.findMany({
        where: whereClause,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          items: {
            include: {
              food: true,
              foodOption: true,
            },
            orderBy: { addedAt: "asc" },
          },
          customer: { select: { name: true } },
          createdBy: {
            select: {
              id: true,
              email: true,
              staff: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.order.count({ where: whereClause }),
      prisma.order.groupBy({
        by: ["status"],
        where: {
          restaurantId,
          status: { in: ["ACCEPTED", "PREPARING", "READY"] },
          ...(search
            ? {
                OR: [
                  { id: { equals: parseInt(search) || -1 } },
                  {
                    customer: {
                      name: { contains: search, mode: "insensitive" },
                    },
                  },
                ],
              }
            : {}),
        },
        _count: {
          id: true,
        },
      }),
    ]);

    // Initialize counts
    const statusCounts = {
      accepted: 0,
      preparing: 0,
      ready: 0,
    };

    // ✅ Map counts safely (groupBy returns array)
    counts.forEach((group) => {
      const status = group.status.toLowerCase();
      if (status in statusCounts) {
        statusCounts[status as keyof typeof statusCounts] = group._count.id;
      }
    });

    return NextResponse.json({
      orders,
      totalPages: Math.ceil(total / limit),
      counts: statusCounts,
    });
  } catch (error) {
    console.error("GET /api/kitchen", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
