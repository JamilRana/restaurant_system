// app/api/admin/expenses/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "../../../../lib/authOptions";
import { ExpenseCategory, StaffRole } from "@prisma/client"; // Optional: import types

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const restaurantId = session.user.restaurantId;
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";
  const startDate = searchParams.get("startDate") || null;
  const endDate = searchParams.get("endDate") || null;

  try {
    const where: any = { restaurantId };
    if (search) {
      where.OR = [
        { description: { contains: search, mode: "insensitive" } },
        { notes: { contains: search, mode: "insensitive" } },
      ];
    }
    if (category) {
      where.category = category;
    }
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const [expenses, totalCount] = await prisma.$transaction([
      prisma.expense.findMany({
        where,
        select: {
          id: true,
          description: true,
          category: true,
          amount: true,
          date: true,
          recurring: true,
          notes: true,
          updatedAt: true,
          staff: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
        orderBy: { date: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.expense.count({ where }),
    ]);

    const categoryTotals = await prisma.expense.groupBy({
      by: ["category"],
      where,
      _sum: { amount: true },
    });

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    return NextResponse.json({
      data: expenses.map((e) => ({
        id: e.id,
        description: e.description,
        category: e.category as ExpenseCategory,
        amount: e.amount,
        date: e.date.toISOString().split("T")[0],
        recurring: e.recurring,
        notes: e.notes,
        updatedAt: e.updatedAt.toISOString(),
        staffId: e.staff?.id || null,
        staff: e.staff
          ? {
              id: e.staff.id,
              name: e.staff.name,
              role: e.staff.role as StaffRole,
            }
          : null,
      })),
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
      totalExpenses,
      categoryWiseTotals: Object.fromEntries(
        categoryTotals.map(({ category, _sum }) => [category, _sum.amount || 0])
      ),
    });
  } catch (error) {
    console.error("Fetch expenses error:", error);
    return NextResponse.json(
      { error: "Failed to load expenses" },
      { status: 500 }
    );
  }
}

// POST - Create Expense
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await request.json();
  const restaurantId = session.user.restaurantId;

  if (!restaurantId) {
    return NextResponse.json(
      { error: "No restaurant assigned" },
      { status: 403 }
    );
  }

  if (!data.description || !data.category || typeof data.amount !== "number") {
    return NextResponse.json(
      { error: "Description, category, and amount (number) are required" },
      { status: 400 }
    );
  }

  try {
    const expense = await prisma.expense.create({
      data: {
        description: data.description,
        category: data.category,
        amount: data.amount,
        date: data.date ? new Date(data.date) : new Date(),
        recurring: data.recurring || false,
        notes: data.notes || null,
        receiptPath: data.receiptPath || null,
        staffId: data.staffId || null,
        restaurantId,
      },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error("Create expense error:", error);
    return NextResponse.json(
      { error: "Failed to record expense" },
      { status: 500 }
    );
  }
}

// PUT - Update Expense
export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await request.json();
  const { id, ...updateData } = data;

  if (!id) {
    return NextResponse.json(
      { error: "Expense ID is required" },
      { status: 400 }
    );
  }

  try {
    const expense = await prisma.expense.update({
      where: { id },
      data: {
        ...updateData,
        date: updateData.date ? new Date(updateData.date) : undefined,
        staffId:
          updateData.staffId === ""
            ? null
            : updateData.staffId
            ? parseInt(updateData.staffId, 10)
            : undefined,
      },
    });

    return NextResponse.json(expense);
  } catch (error) {
    console.error("Update expense error:", error);
    return NextResponse.json(
      { error: "Failed to update expense" },
      { status: 500 }
    );
  }
}
