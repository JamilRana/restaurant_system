import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/authOptions";
import { subDays, startOfDay, endOfDay } from "date-fns";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const restaurantId = session.user.restaurantId;
  if (!restaurantId) {
    return NextResponse.json(
      { error: "No restaurant assigned" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const rawStart = searchParams.get("startDate");
  const rawEnd = searchParams.get("endDate");

  const startDate = rawStart ? new Date(rawStart) : subDays(new Date(), 30);
  const endDate = rawEnd ? new Date(rawEnd) : new Date();

  try {
    // 1. Fetch Orders
    const orders = await prisma.order.findMany({
      where: {
        restaurantId,
        status: { in: ["DELIVERED", "READY"] },
        createdAt: { gte: startOfDay(startDate), lte: endOfDay(endDate) },
      },
      select: {
        totalAmount: true,
        finalAmount: true,
        createdAt: true,
        deliveryType: true,
        customerId: true,
      },
    });

    // 2. Expenses
    const expenses = await prisma.expense.findMany({
      where: {
        restaurantId,
        date: { gte: startOfDay(startDate), lte: endOfDay(endDate) },
      },
      select: {
        amount: true,
        category: true,
        staffId: true,
      },
    });

    // 3. Sales & Profit
    const totalSales = orders.reduce((sum, o) => {
      const amount = o.finalAmount || o.totalAmount;
      return sum + (amount ? amount.toNumber() : 0);
    }, 0);

    const totalOrders = orders.length;
    const avgOrderValue = totalOrders ? totalSales / totalOrders : 0;

    const salaryExpenses = expenses
      .filter((e) => e.category === "SALARY")
      .reduce((sum, e) => sum + (e.amount ? e.amount.toNumber() : 0), 0);

    const otherExpenses = expenses
      .filter((e) => e.category !== "SALARY")
      .reduce((sum, e) => sum + (e.amount ? e.amount.toNumber() : 0), 0);

    const totalExpenses = salaryExpenses + otherExpenses;
    const netProfit = totalSales - totalExpenses;

    // 4. Daily Sales Trend
    const dailySales: Record<string, number> = {};
    orders.forEach((order) => {
      const date = order.createdAt.toISOString().split("T")[0];
      const amount = (order.finalAmount || order.totalAmount).toNumber();
      dailySales[date] = (dailySales[date] || 0) + amount;
    });

    // 5. Order Types
    const orderTypes = orders.reduce(
      (acc, o) => {
        acc[o.deliveryType]++;
        return acc;
      },
      { PICKUP: 0, DELIVERY: 0, DINEIN: 0 }
    );

    // 6. Top Categories (using OrderItem)
    const categorySalesRaw = await prisma.$queryRaw<
      { category: string; total: number }[]
    >`
  SELECT 
    c.name as "category",
    SUM(oi.quantity * oi.price) as "total"
  FROM "OrderItem" oi
  JOIN "Food" f ON f.id = oi."foodId"
  JOIN "Category" c ON c.id = f."categoryId"
  JOIN "Order" o ON o.id = oi."orderId"
  WHERE o."restaurantId" = ${restaurantId}
    AND o.status IN ('DELIVERED', 'READY')
    AND o."createdAt" >= ${startOfDay(startDate)} 
    AND o."createdAt" <= ${endOfDay(endDate)}
  GROUP BY c.name
  ORDER BY total DESC
`;

    const categorySales = categorySalesRaw.map((c) => ({
      name: c.category,
      value: Number(c.total),
    }));

    // 7. Peak Hours
    const hourlySales: Record<string, number> = {};
    orders.forEach((order) => {
      const hour = order.createdAt.getHours().toString();
      const amount = (order.finalAmount || order.totalAmount).toNumber();
      hourlySales[hour] = (hourlySales[hour] || 0) + amount;
    });

    interface TopZoneResult {
      postcode: string;
      count: number;
    }
    // 8. Top Delivery Zones
    const topZonesRaw = await prisma.$queryRaw<TopZoneResult[]>`
  SELECT 
    dz."postcode",
    COUNT(o."id")::INTEGER as "count"
  FROM "DeliveryZone" dz
  LEFT JOIN "Order" o 
    ON o."postcode" = dz."postcode"
    AND o."deliveryType" = 'DELIVERY'
    AND o.status IN ('DELIVERED', 'READY')
    AND o."createdAt" >= ${startOfDay(startDate)} 
    AND o."createdAt" <= ${endOfDay(endDate)}
  WHERE dz."restaurantId" = ${restaurantId}
  GROUP BY dz."postcode"
  ORDER BY "count" DESC
  LIMIT 5
`;
    const topZones = topZonesRaw.map((z) => ({
      postcode: z.postcode,
      count: z.count,
    }));

    // 9. Promo Codes
    const promoUsage = await prisma.promoCode.findMany({
      where: { restaurantId },
      select: {
        code: true,
        currentUses: true,
        discountAmount: true,
        discountPercent: true,
      },
    });

    const formattedPromoUsage = promoUsage.map((p) => ({
      code: p.code,
      uses: p.currentUses,
      discount: p.discountAmount
        ? `£${p.discountAmount.toNumber().toFixed(2)}`
        : `${p.discountPercent}%`,
    }));

    // 10. Staff Performance
    const staffHours = await prisma.expense.groupBy({
      by: ["staffId"],
      where: {
        restaurantId,
        category: "SALARY",
        date: { gte: startOfDay(startDate), lte: endOfDay(endDate) },
      },
      _sum: { amount: true },
    });

    const staffHoursMap = new Map<number, number>(
      staffHours
        .filter(
          (sh): sh is { staffId: number; _sum: { amount: any } } =>
            sh.staffId !== null
        )
        .map((sh) => [sh.staffId, sh._sum.amount.toNumber()])
    );

    const staffList = await prisma.staff.findMany({
      where: { restaurantId },
      select: {
        id: true,
        name: true,
        role: true,
        hourlyRate: true,
      },
    });

    const staffPerformance = staffList.map((s) => {
      const pay = staffHoursMap.get(s.id) || 0;
      const hourlyRate = s.hourlyRate?.toNumber() || 0;
      const hours = hourlyRate ? pay / hourlyRate : 0;

      return {
        id: s.id,
        name: s.name,
        role: s.role,
        hours: Number(hours.toFixed(1)),
        pay: Number(pay.toFixed(2)),
      };
    });

    // 11. Retention Rate
    const firstOrders = await prisma.order.groupBy({
      by: ["customerId"],
      where: { restaurantId },
      _min: { createdAt: true },
    });

    const returningCustomers = firstOrders.filter((fo) => {
      const firstOrderDate = fo._min.createdAt;
      if (!firstOrderDate) return false;

      return orders.some(
        (o) => o.createdAt > firstOrderDate && o.customerId === fo.customerId
      );
    }).length;

    const retentionRate =
      totalOrders > 0 ? (returningCustomers / totalOrders) * 100 : 0;

    return NextResponse.json({
      summary: {
        totalSales: Number(totalSales.toFixed(2)),
        netProfit: Number(netProfit.toFixed(2)),
        avgOrderValue: Number(avgOrderValue.toFixed(2)),
        totalOrders,
        retentionRate: Number(retentionRate.toFixed(2)),
      },
      salesTrend: Object.entries(dailySales).map(([date, value]) => ({
        date,
        value,
      })),
      orderTypes,
      categorySales,
      hourlySales: Object.entries(hourlySales)
        .map(([hour, value]) => ({ hour: `${hour}:00`, value }))
        .sort((a, b) => parseInt(a.hour) - parseInt(b.hour)),
      topZones,
      promoUsage: formattedPromoUsage,
      staffPerformance,
    });
  } catch (error) {
    console.error("GET /api/admin/analytics", error);
    return NextResponse.json(
      { error: "Failed to load analytics" },
      { status: 500 }
    );
  }
}
