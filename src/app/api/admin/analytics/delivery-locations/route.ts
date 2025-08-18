// app/api/admin/analytics/delivery-locations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DeliveryLocation } from '@/types/analytics';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const startDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const endDate = to ? new Date(to) : new Date();

  // Validate dates
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return NextResponse.json(
      { error: 'Invalid date range' },
      { status: 400 }
    );
  }

  try {
    const result = await prisma.order.groupBy({
      by: ['postcode'],
      where: {
        deliveryType: 'DELIVERY',
        postcode: { not: null },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: {
        id: true,
      },
    });

    const  data:DeliveryLocation[] = result
      .filter(r => r.postcode)
      .map(r => ({
        postcode: r.postcode!,
        count: r._count.id,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching delivery locations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch delivery locations' },
      { status: 500 }
    );
  }
}