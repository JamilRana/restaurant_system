// api/tables/reservations/list/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/authOptions";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId"); // ← This is User.id
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "8");
  const filter = searchParams.get("filter");

  if (!userId) {
    return NextResponse.json({ error: "User ID required" }, { status: 400 });
  }

  try {
    // ✅ Step 1: Find the Customer linked to this User
    const customer = await prisma.customer.findUnique({
      where: { userId: parseInt(userId) },
    });

    if (!customer) {
      // ✅ No customer profile → no reservations
      return NextResponse.json({ reservations: [], totalPages: 0 });
    }

    // ✅ Step 2: Use Customer.id to find reservations
    const whereClause: any = {
      customerId: customer.id,
    };

    if (filter === "upcoming") {
      whereClause.startsAt = { gte: new Date() };
    } else if (filter === "past") {
      whereClause.startsAt = { lt: new Date() };
    }

    const [reservations, total] = await Promise.all([
      prisma.reservation.findMany({
        where: whereClause,
        include: {
          restaurant: { select: { name: true } },
          tables: { include: { table: { select: { number: true } } } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { startsAt: "desc" },
      }),
      prisma.reservation.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      reservations,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching reservations:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
