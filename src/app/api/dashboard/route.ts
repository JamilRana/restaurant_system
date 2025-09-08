// app/api/dashboard/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("Dashboard request body:", body);

    const { phone, email } = body;

    if (!phone || !email) {
      return NextResponse.json(
        { error: "Phone and email are required" },
        { status: 400 }
      );
    }

    // Find active reservations
    const reservations = await prisma.reservation.findMany({
      where: {
        phone,
        email,
        status: { in: ["PENDING", "CONFIRMED", "CANCELLED"] },
      },
      include: {
        tables: {
          include: {
            table: { select: { number: true } },
          },
        },
      },
      orderBy: { startsAt: "desc" },
    });

    // Find active orders — now including items and food
    const customer = await prisma.customer.findFirst({
      where: { phone, email },
      include: {
        orders: {
          where: {
            status: {
              in: ["PLACED", "ACCEPTED", "PREPARING", "READY", "REJECTED"],
            },
          },
          orderBy: { createdAt: "desc" },
          include: {
            items: {
              include: {
                food: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const orders = customer?.orders || [];

    return NextResponse.json({
      data: { reservations, orders },
    });
  } catch (error) {
    console.error("Dashboard fetch error:", error);
    return NextResponse.json({ error: "Failed to load data" }, { status: 500 });
  }
}
