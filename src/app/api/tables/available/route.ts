// app/api/tables/available/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const tables = await prisma.table.findMany({
      where: {
        status: { in: ["AVAILABLE"] },
        restaurantId: 1,
      },
      select: {
        id: true,
        number: true,
        capacity: true,
      },
      orderBy: { number: "asc" },
    });

    return NextResponse.json(tables);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load tables" },
      { status: 500 }
    );
  }
}
