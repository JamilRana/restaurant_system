// pages/api/admin/analytics/sales
import { NextApiRequest, NextApiResponse } from 'next';
import { SalesData } from '@/types/analytics';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';


export  async function GET(request:NextRequest){
  const { searchParams } = request.nextUrl;
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const startDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const endDate = to ? new Date(to) : new Date();
  try{
  const [sales, orders] = await Promise.all([
    prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: {
        status: { in: ['delivered', 'ready'] },
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
    prisma.order.count({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
  ]);
  return NextResponse.json({
      totalSales: sales._sum.totalAmount || 0,
      totalOrders: orders,
    });
  } catch (error) {
    console.error('Error fetching sales data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sales data' },
      { status: 500 }
    );
  }
}