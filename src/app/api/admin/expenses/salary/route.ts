// app/api/admin/expenses/salary/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "../../../../../lib/authOptions";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await request.json();
  const { staffId, amount, date, notes } = data;
  const restaurantId = session.user.restaurantId;
  if (!restaurantId) {
    return NextResponse.json(
      { error: "No restaurant assigned" },
      { status: 403 }
    );
  }

  if (!staffId || !amount || amount <= 0) {
    return NextResponse.json(
      { error: "Staff ID and valid amount are required" },
      { status: 400 }
    );
  }

  try {
    const staff = await prisma.staff.findFirst({
      where: { id: staffId, restaurantId },
    });

    if (!staff) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    const expense = await prisma.expense.create({
      data: {
        description: "Salary Payment",
        category: "SALARY",
        amount,
        date: date ? new Date(date) : new Date(),
        notes: notes || `Salary payment for ${staff.name}`,
        restaurantId,
        staffId,
      },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error: any) {
    console.error("Failed to record salary payment:", error);
    return NextResponse.json(
      { error: "Failed to record payment" },
      { status: 500 }
    );
  }
}
