// app/api/admin/analytics/sales-trend/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const startDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const endDate = to ? new Date(to) : new Date();

  // Validate dates
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return NextResponse.json(
      { error: 'Invalid date format' },
      { status: 400 }
    );
  }

  try {
    const result: {
      day: Date;
      _sum: { totalAmount: bigint };
      _count: number;
    }[] = await prisma.$queryRaw`
      SELECT 
        DATE("createdAt") as "day",
        SUM("totalAmount") as "_sum",
        COUNT(*) as "_count"
      FROM "Order"
      WHERE "createdAt" BETWEEN ${startDate} AND ${endDate}
        AND "status" IN ('delivered', 'ready')
      GROUP BY DATE("createdAt")
      ORDER BY "day"
    `;

    const data = result.map(r => ({
      date: r.day.toISOString().split('T')[0],
      total: Number(r._sum.totalAmount || 0),
      orders: r._count,
    }));

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching sales trend data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sales trend data' },
      { status: 500 }
    );
  }
}