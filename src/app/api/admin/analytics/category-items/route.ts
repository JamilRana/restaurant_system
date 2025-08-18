// app/api/admin/analytics/category-items/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CategoryItem } from '@/types/analytics';

export async function GET(request: NextRequest) {
  try {
    const result = await prisma.category.findMany({
      include: {
        foods: {
          where: { available: true },
        },
      },
    });

    const  data:CategoryItem[] = result.map(cat => ({
      name: cat.name,
      foodCount: cat.foods.length,
    }));

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching category items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch category-wise item count' },
      { status: 500 }
    );
  }
}