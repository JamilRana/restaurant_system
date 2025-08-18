// app/api/admin/analytics/order-types/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // ✅ Reuse singleton instance
import { OrderTypeData } from '@/types/analytics';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const startDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const endDate = to ? new Date(to) : new Date();

  // Validate date inputs
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return NextResponse.json(
      { error: 'Invalid date format' },
      { status: 400 }
    );
  }

  try {
    const result = await prisma.order.groupBy({
      by: ['deliveryType'],
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: {
        id: true,
      },
    });

    const data: OrderTypeData[] = result.map(r => ({
      type: r.deliveryType as 'PICKUP' | 'DELIVERY',
      count: r._count.id,
    }));

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching order types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order type data' },
      { status: 500 }
    );
  }
}