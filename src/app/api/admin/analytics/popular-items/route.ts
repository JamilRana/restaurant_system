// app/api/admin/analytics/popular-items/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const startDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const endDate = to ? new Date(to) : new Date();

  try {
    const result: {
      foodId: number;
      name: string;
      image: string | null;
      _sum: { quantity: bigint };
    }[] = await prisma.$queryRaw`
      SELECT 
        f."id" as "foodId",
        f."name",
        f."image",
        SUM(oi."quantity") as "_sum"
      FROM "OrderItem" oi
      JOIN "Food" f ON oi."foodId" = f."id"
      JOIN "Order" o ON oi."orderId" = o."id"
      WHERE o."createdAt" BETWEEN ${startDate} AND ${endDate}
      GROUP BY f."id", f."name", f."image"
      ORDER BY "_sum" DESC
      LIMIT 10
    `;

    const data = result.map(r => ({
      foodId: r.foodId,
      name: r.name,
      image: r.image,
      totalSold: Number(r._sum), // bigint → number
    }));

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching popular items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch popular items' },
      { status: 500 }
    );
  }
}