// app/api/admin/analytics/total-stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CustomerStats, StaffStats } from '@/types/analytics';

export async function GET(request: NextRequest) {
  try {
    const [registered, guest, totalStaff, activeStaff] = await Promise.all([
      prisma.customer.count(),
      prisma.order.count({ where: { isGuestOrder: true } }),
      prisma.staff.count(),
      prisma.staff.count({ where: { active: true } }),
    ]);

    const data = {
      customers: {
        totalCustomers: registered,
        guestCustomers: guest,
        registeredCustomers: registered,
      } as CustomerStats,
      staff: {
        totalStaff,
        activeStaff,
      } as StaffStats,
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching total stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch total stats' },
      { status: 500 }
    );
  }
}