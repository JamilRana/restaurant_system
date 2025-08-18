// app/api/admin/expenses/salary/due/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { StaffDuePayment } from "@/types";

function calculateExpectedMonthlySalary(staff: {
  salary: number | null;
  hourlyRate: number | null;
  salaryPeriod: "HOURLY" | "WEEKLY" | "MONTHLY" | null;
}): number {
  switch (staff.salaryPeriod) {
    case "MONTHLY":
      return staff.salary || 0;
    case "WEEKLY":
      return (staff.salary || 0) * 4;
    case "HOURLY":
      return (staff.hourlyRate || 0) * 8 * 5 * 4; // 8 hrs/day × 5 days × 4 weeks
    default:
      return 0;
  }
}

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
    const staffList = await prisma.staff.findMany({
      where: { restaurantId, active: true },
      include: {
        expenses: {
          where: {
            category: "SALARY",
            date: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
        },
      },
    });

    const duePayments: StaffDuePayment[] = staffList
      .map((staff) => {
        const expected = calculateExpectedMonthlySalary(staff);
        const paid = staff.expenses.reduce((sum, exp) => sum + exp.amount, 0);
        const due = Math.max(expected - paid, 0);

        return {
          id: staff.id,
          name: staff.name,
          role: staff.role,
          expected: parseFloat(expected.toFixed(2)),
          paid: parseFloat(paid.toFixed(2)),
          due: parseFloat(due.toFixed(2)),
        };
      })
      .filter((payment) => payment.due > 0);

    return NextResponse.json(duePayments);
  } catch (error) {
    console.error("Due payments error:", error);
    return NextResponse.json(
      { error: "Failed to calculate due payments" },
      { status: 500 }
    );
  }
}
