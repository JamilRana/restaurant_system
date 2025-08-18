// /app/api/postcodeSearch/route.ts
import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('query');

  if (!query || query.length < 2) {
    return new Response(JSON.stringify([]), { status: 200 });
  }

  try {
    const zones = await prisma.deliveryZone.findMany({
      where: {
        postcode: {
          startsWith: query.toUpperCase().trim(),
        },
      },
      select: {
        postcode: true,
        deliveryFee: true,
      },
      take: 10,
    });

    // Return [{ postcode: "SW1A 1AA", deliveryFee: 2.5 }, ...]
    return new Response(JSON.stringify(zones), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Postcode search error:", error);
    return new Response(JSON.stringify([]), { status: 500 });
  }
}