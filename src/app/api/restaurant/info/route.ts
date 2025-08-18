// app/api/restaurant/info/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const restaurant = await prisma.restaurant.findFirst({
      select: {
        id: true,
        name: true,
        email: true,
        address: true,
        logoPath: true,
        deliveryTime: true,
        collectionTime: true,
        createdAt: true,
      },
    });

    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not configured" }, { status: 404 });
    }

    return NextResponse.json(restaurant);
  } catch (error) {
    console.error("GET /api/restaurant/info", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}