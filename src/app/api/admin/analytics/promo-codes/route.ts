// app/api/admin/analytics/promo-codes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PromoCodeUsage } from '@/types/analytics';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const startDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endDate = to ? new Date(to) : new Date();

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
  }

  try {
    // Get all active promo codes
    const promoCodes = await prisma.promoCode.findMany({
      where: {
        active: true,
        expiresAt: { not: { lt: new Date() } }, // Not expired
      },
      select: {
        code: true,
      },
    });

    // Count usage per promo code from orders
    const usageCounts = await prisma.order.groupBy({
      by: ['promoCode'],
      where: {
        promoCode: { not: null },
        createdAt: { gte: startDate, lte: endDate },
      },
      _count: { id: true },
    });

    // Map to include all active codes, even if used 0 times
    const  data:PromoCodeUsage[] = promoCodes.map(pc => {
      const usage = usageCounts.find(u => u.promoCode === pc.code);
      return {
        code: pc.code,
        uses: usage ? usage._count.id : 0,
      };
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching promo code usage:', error);
    return NextResponse.json(
      { error: 'Failed to fetch promo code usage' },
      { status: 500 }
    );
  }
}