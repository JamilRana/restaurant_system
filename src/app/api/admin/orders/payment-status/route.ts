// app/api/admin/orders/payment-status/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { orderId } = await request.json();

  if (!orderId || isNaN(Number(orderId))) {
    return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id: Number(orderId) },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // if (order.paymentMethod !== "card") {
    //   return NextResponse.json(
    //     { error: "Only card payments can be manually marked as paid" },
    //     { status: 400 }
    //   );
    // }

    const updatedOrder = await prisma.order.update({
      where: { id: Number(orderId) },
      data: { paymentStatus: "paid" },
      include: {
        customer: { select: { name: true, email: true } },
        items: { include: { food: true } },
      },
    });

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error("Failed to update payment status:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
