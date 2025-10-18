// app/api/admin/orders/count/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/authOptions";
import { OrderStatus } from "@prisma/client";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ count: 0 });
  }

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");

  // ✅ Validate and cast status to OrderStatus
  let status: OrderStatus | undefined;
  if (
    statusParam &&
    Object.values(OrderStatus).includes(statusParam as OrderStatus)
  ) {
    status = statusParam as OrderStatus;
  }

  try {
    const count = await prisma.order.count({
      where: {
        // ✅ Ensure restaurantId is a number (not null)
        restaurantId: session.user.restaurantId!, // Use non-null assertion since we validated role
        ...(status ? { status } : {}), // Only add status filter if valid
      },
    });
    return NextResponse.json({ count });
  } catch (error) {
    console.error("Error fetching order count:", error);
    return NextResponse.json({ count: 0 });
  }
}
