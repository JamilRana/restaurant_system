// app/api/waiter/orders/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "WAITER", "KITCHEN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const search = searchParams.get("search") || "";
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");
  const status = searchParams.get("status")?.split(",") || null;

  const restaurantId = session.user.restaurantId;
  if (!restaurantId) {
    return NextResponse.json(
      { error: "No restaurant assigned" },
      { status: 400 }
    );
  }

  // Parse dates safely
  const startDate = startDateParam ? new Date(startDateParam) : null;
  let endDate = endDateParam ? new Date(endDateParam) : null;

  if (endDate) {
    endDate = new Date(endDate);
    endDate.setHours(23, 59, 59, 999); // Safe copy via constructor + mutate
  }

  // Build WHERE filter
  const where: any = {
    restaurantId,
  };

  // Search by customer name or email (guest or registered)
  if (search) {
    where.customer = {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    };
  }

  // Date range filter
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  if (searchParams.get("createdById")) {
    where.createdById = parseInt(searchParams.get("createdById")!);
  }
  // Status filter
  if (status && status.length > 0) {
    where.status = { in: status };
    // } else {
    //   // Default: only active statuses
    //   where.status = { notIn: ["DELIVERED", "REJECTED"] };
  }

  try {
    // Fetch orders
    // app/api/waiter/orders/route.ts
    const [orders, totalCount] = await prisma.$transaction([
      prisma.order.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, email: true } },
          currentTableFor: { select: { number: true } },
          items: {
            include: {
              food: {
                // ✅ Include food
                include: {
                  options: true, // ✅ Include options
                },
              },
              foodOption: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    // Format orders
    const formattedOrders = orders.map((order) => ({
      ...order,
      createdAt: order.createdAt.toISOString(),
      items: order.items.map((item) => ({
        ...item,
        price: Number(item.price),
      })),
    }));

    // 🔢 Calculate stats
    const [dailyStats, allTimeStats] = await prisma.$transaction([
      // Daily stats
      prisma.order.aggregate({
        where: {
          restaurantId,
          createdAt: {
            gte: startDate || new Date(new Date().setHours(0, 0, 0, 0)),
            lte: endDate || new Date(new Date().setHours(23, 59, 59, 999)),
          },
          status: { notIn: ["REJECTED"] },
        },
        _sum: { finalAmount: true },
        _count: { id: true },
      }),

      // All-time stats (only DELIVERED/accepted)
      prisma.order.aggregate({
        where: {
          restaurantId,
          status: { notIn: ["REJECTED"] },
        },
        _sum: { finalAmount: true },
        _count: { id: true },
      }),
    ]);

    const dailySales = Number(dailyStats._sum.finalAmount || 0);
    const dailyOrders = dailyStats._count.id;
    const allTimeSales = Number(allTimeStats._sum.finalAmount || 0);
    const allTimeOrders = allTimeStats._count.id;

    return NextResponse.json({
      orders: formattedOrders,
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
      stats: {
        daily: { sales: dailySales, orders: dailyOrders },
        allTime: { sales: allTimeSales, orders: allTimeOrders },
      },
    });
  } catch (error) {
    console.error("Error fetching waiter orders:", error);
    return NextResponse.json(
      { error: "Failed to load orders" },
      { status: 500 }
    );
  }
}
