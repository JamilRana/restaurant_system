// src/app/api/admin/analytics/finances/route.ts
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const startDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endDate = to ? new Date(to) : new Date();

  try {
    const [income, expenses] = await Promise.all([
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: {
          status: { in: ["delivered", "ready"] },
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      prisma.expense.aggregate({
        _sum: { amount: true },
        where: {
          date: { gte: startDate, lte: endDate },
        },
      }),
    ]);

    const data = {
      income: income._sum.totalAmount || 0,
      expenses: expenses._sum.amount || 0,
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching finance data:", error);
    return NextResponse.json(
      { error: "Failed to fetch finance data" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}