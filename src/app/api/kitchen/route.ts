// app/api/kitchen/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "../../../lib/authOptions";
import { $Enums } from "@prisma/client";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "KITCHEN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "10", 10);
  const statusFilter = searchParams.get("status") || "";
  const search = searchParams.get("search") || "";

  const validStatuses: $Enums.OrderStatus[] = [
    "accepted",
    "preparing",
    "ready",
  ];

  // Base where clause
  let whereClause: any = { status: { in: validStatuses } };

  if (statusFilter && validStatuses.includes(statusFilter as any)) {
    whereClause.status = statusFilter;
  }

  if (search) {
    const searchInt = parseInt(search);
    whereClause.OR = [
      { id: isNaN(searchInt) ? undefined : { equals: searchInt } },
      { customer: { name: { contains: search, mode: "insensitive" } } },
    ].filter(Boolean);
  }

  try {
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
          status: { in: validStatuses },
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
        _count: { id: true },
      }),
    ]);

    const statusCounts = {
      accepted: 0,
      preparing: 0,
      ready: 0,
    };

    counts.forEach((c) => {
      if (c.status in statusCounts) {
        statusCounts[c.status as keyof typeof statusCounts] = c._count.id;
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
