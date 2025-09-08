// app/api/admin/tables/suggestions/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Table = {
  id: number;
  number: string;
  capacity: number;
  status: string;
};

function findCombinations(
  tables: Table[],
  guests: number,
  maxTables = 3
): { tables: Table[]; total: number; score: number }[] {
  const results: { tables: Table[]; total: number; score: number }[] = [];

  function helper(start: number, combo: Table[], total: number) {
    if (combo.length > 0 && total >= guests && combo.length <= maxTables) {
      const efficiency = total - guests; // lower is better
      const penalty = combo.length > 1 ? 1 : 0; // prefer single tables
      const score = efficiency + penalty * 5; // weighted score
      results.push({ tables: [...combo], total, score });
    }
    if (combo.length >= maxTables) return;
    for (let i = start; i < tables.length; i++) {
      helper(i + 1, [...combo, tables[i]], total + tables[i].capacity);
    }
  }

  helper(0, [], 0);

  // Sort by score (best fit first)
  return results.sort((a, b) => a.score - b.score).slice(0, 5); // limit to top 5 suggestions
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "WAITER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const guests = parseInt(searchParams.get("guests") || "");
  const dateString = searchParams.get("date");

  // ✅ Validate guests
  if (isNaN(guests) || guests <= 0) {
    return NextResponse.json(
      { error: "Invalid or missing 'guests'" },
      { status: 400 }
    );
  }

  // ✅ Validate date string
  if (!dateString || dateString === "undefined" || dateString === "null") {
    return NextResponse.json(
      { error: "Missing or invalid 'date'" },
      { status: 400 }
    );
  }

  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }

  try {
    // ✅ Correct Prisma Query: Find available tables with no overlapping reservation
    const availableTables = await prisma.table.findMany({
      where: {
        status: "AVAILABLE",
        // Check that no ReservationTable links to a conflicting reservation
        reservations: {
          none: {
            reservation: {
              startsAt: {
                gte: new Date(date.getTime() - 3600000), // 1 hour before
                lte: new Date(date.getTime() + 7200000), // 2 hours after
              },
            },
          },
        },
      },
      select: {
        id: true,
        number: true,
        capacity: true,
        status: true,
      },
    });

    // ✅ Filter tables that can fit the guest count
    const allFitTables = availableTables
      .filter((t) => t.capacity >= guests)
      .sort((a, b) => a.capacity - b.capacity); // ascending by capacity

    const bestFit = allFitTables[0] || null;

    let combinations: { tables: Table[]; total: number; score: number }[] = [];

    // Only calculate combinations if no single table fits
    if (!bestFit) {
      combinations = findCombinations(availableTables, guests, 3);
    }

    return NextResponse.json({
      allFitTables,
      bestFit,
      combinations,
      availableTables, // optional: useful for debugging
    });
  } catch (error) {
    console.error("Error in table suggestions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
