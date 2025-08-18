// app/api/admin/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || undefined;

  const skip = (page - 1) * limit;

  const whereClause: any = {};
  if (search) {
    whereClause.OR = [
      { customer: { name: { contains: search, mode: "insensitive" } } },
      { restaurant: { name: { contains: search, mode: "insensitive" } } },
      { id: { equals: parseInt(search) || 0 } },
    ];
  }
  if (status) {
    whereClause.status = status;
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: whereClause,
      include: {
        customer: true,
        restaurant: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.order.count({ where: whereClause }),
  ]);

  return NextResponse.json({
    orders,
    total,
    totalPages: Math.ceil(total / limit),
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id, status } = body;

  try {
    const updated = await prisma.order.update({
      where: { id },
      data: { status },
    });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
