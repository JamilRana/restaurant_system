// app/api/cancel/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { phone, email, type } = await req.json();

    if (!phone || !email || !type) {
      return NextResponse.json(
        { error: "Phone, email, and type are required" },
        { status: 400 }
      );
    }

    if (type !== "reservation" && type !== "order") {
      return NextResponse.json(
        { error: "Type must be 'reservation' or 'order'" },
        { status: 400 }
      );
    }

    if (type === "reservation") {
      const reservation = await prisma.reservation.findFirst({
        where: { phone, email },
        include: {
          tables: {
            include: { table: true },
          },
        },
      });

      if (!reservation) {
        return NextResponse.json(
          { error: "No reservation found" },
          { status: 404 }
        );
      }

      if (
        reservation.status !== "PENDING" &&
        reservation.status !== "CONFIRMED"
      ) {
        return NextResponse.json(
          { error: "This reservation cannot be cancelled" },
          { status: 400 }
        );
      }

      // ✅ Release all assigned tables via ReservationTable
      const reservationTables = await prisma.reservationTable.findMany({
        where: { reservationId: reservation.id },
      });

      for (const rt of reservationTables) {
        await prisma.table.update({
          where: { id: rt.tableId },
          data: { status: "AVAILABLE" },
        });
      }

      // ✅ Cancel the reservation
      await prisma.reservation.update({
        where: { id: reservation.id },
        data: { status: "CANCELLED" },
      });
    }

    if (type === "order") {
      const customer = await prisma.customer.findFirst({
        where: { phone, email },
        include: {
          orders: {
            where: { status: "PLACED" },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      });

      if (!customer) {
        return NextResponse.json(
          { error: "No account found with this phone and email" },
          { status: 404 }
        );
      }

      const order = customer.orders[0];
      if (!order) {
        return NextResponse.json(
          { error: "No pending order found to cancel" },
          { status: 400 }
        );
      }

      await prisma.order.update({
        where: { id: order.id },
        data: { status: "REJECTED" },
      });

      return NextResponse.json({
        message: "Your order has been cancelled successfully.",
      });
    }
  } catch (error) {
    console.error("Cancellation error:", error);
    return NextResponse.json(
      { error: "Failed to process cancellation" },
      { status: 500 }
    );
  }
}
