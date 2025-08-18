// app/api/waiter/orders/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const GETQuerySchema = z.object({
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(10),
  status: z.string().optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !["WAITER", "KITCHEN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ✅ Get restaurantId via Staff (safer)
  const staff = await prisma.staff.findFirst({
    where: { userId: session.user.id },
  });

  if (!staff) {
    return NextResponse.json(
      { error: "No staff profile found" },
      { status: 403 }
    );
  }
  const createdById = session.user.id;

  const restaurantId = staff.restaurantId;

  if (!restaurantId) {
    return NextResponse.json(
      { error: "No restaurant assigned" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const parsed = GETQuerySchema.safeParse(Object.fromEntries(searchParams));

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const { page, limit, status, search, startDate, endDate } = parsed.data;

  let whereClause: any = { restaurantId, createdById }; // ✅ Now safe

  if (status) {
    whereClause.status = { in: status.split(",") };
  }

  if (search) {
    whereClause.OR = [
      { id: { equals: parseInt(search) } },
      { guestName: { contains: search, mode: "insensitive" } },
    ];
  }

  // Date filtering
  if (startDate || endDate) {
    whereClause.createdAt = {};
    if (startDate) whereClause.createdAt.gte = new Date(startDate);
    if (endDate) whereClause.createdAt.lte = new Date(endDate);
  } else {
    // Default to today
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));
    whereClause.createdAt = { gte: startOfDay, lte: endOfDay };
  }

  try {
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: whereClause,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          customer: { select: { name: true } },
          items: {
            include: {
              food: {
                include: { options: true },
              },
            },
          },
          table: { select: { number: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.order.count({ where: whereClause }),
    ]);

    const cleanedOrders = orders.map((order) => ({
      ...order,
      totalAmount: Number(order.totalAmount.toFixed(2)),
      finalAmount: order.finalAmount
        ? Number(order.finalAmount.toFixed(2))
        : null,
    }));
    return NextResponse.json({
      orders: cleanedOrders,
      totalCount: total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error("Failed to fetch waiter orders:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
