// app/api/admin/expenses/salary/history/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/authOptions";
import { SalaryPayment } from "@/types";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const restaurantId = session.user.restaurantId;
  if (!restaurantId) {
    return NextResponse.json(
      { error: "No restaurant assigned" },
      { status: 403 }
    );
  }

  try {
    const expenses = await prisma.expense.findMany({
      where: {
        restaurantId,
        category: "SALARY",
      },
      include: {
        staff: {
          select: {
            name: true,
            role: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });

    const result: SalaryPayment[] = expenses.map((expense) => ({
      id: expense.id,
      staffId: expense.staffId ?? -1,
      staffName: expense.staff?.name ?? "Unknown",
      role: expense.staff?.role ?? "OTHER",
      amount: expense.amount,
      date: expense.date.toISOString().split("T")[0],
      notes: expense.notes,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Fetch salary payments error:", error);
    return NextResponse.json(
      { error: "Failed to load payment history" },
      { status: 500 }
    );
  }
}
