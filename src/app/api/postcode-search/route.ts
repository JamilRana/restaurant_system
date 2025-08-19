// app/api/postcode-search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = searchParams.get("query");
  const restaurantId = searchParams.get("restaurantId");

  // Validate required params
  if (!query || !restaurantId) {
    return NextResponse.json(
      { error: "Missing query or restaurantId" },
      { status: 400 }
    );
  }

  const id = parseInt(restaurantId);
  if (isNaN(id)) {
    return NextResponse.json(
      { error: "Invalid restaurantId" },
      { status: 400 }
    );
  }

  try {
    const zones = await prisma.deliveryZone.findMany({
      where: {
        restaurantId: id,
        postcode: {
          startsWith: query.trim().toUpperCase(),
        },
      },
      orderBy: { postcode: "asc" },
      // Optional: limit results
      take: 10,
    });

    // ✅ Return as { zones: [...] }
    return NextResponse.json({ zones });
  } catch (error) {
    console.error("GET /api/postcode-search", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
