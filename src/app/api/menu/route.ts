// app/api/menu/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const revalidate = 60;
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      include: {
        foods: {
          include: {
            options: true, // ✅ Now includes food options
          },
        },
      },
    });

    return Response.json(categories, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
      },
    });
  } catch (error) {
    console.error("Error fetching menu:", error);
    return NextResponse.json(
      { error: "Failed to fetch menu data" },
      { status: 500 }
    );
  }
}
