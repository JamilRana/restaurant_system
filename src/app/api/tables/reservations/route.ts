// app/api/reservation/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  try {
    const body = await req.json();

    const { name, phone, email, guests, date: dateIso, duration, notes } = body;

    // ✅ Validate required fields
    if (!name || !phone || !guests || !dateIso) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // ✅ Parse and validate date
    const requestedDate = new Date(dateIso);
    if (isNaN(requestedDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 }
      );
    }

    // ✅ Prevent past dates
    if (requestedDate < new Date()) {
      return NextResponse.json(
        { error: "Cannot book for past date" },
        { status: 400 }
      );
    }

    // ✅ Find or create customer
    let customer = await prisma.customer.findFirst({
      where: {
        OR: [{ phone }, { email: email || "" }],
      },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name,
          phone,
          email: email || "",
          // Link to user if authenticated
          user: session?.user?.id
            ? { connect: { id: session.user.id } }
            : undefined,
        },
      });
    } else {
      // Only update customer if they're a guest (no user account)
      if (!customer.userId) {
        const needsUpdate =
          customer.name !== name || (email && customer.email !== email);

        if (needsUpdate) {
          customer = await prisma.customer.update({
            where: { id: customer.id },
            data: { name, email: email || customer.email },
          });
        }
      }
    }

    // ✅ Create reservation linked to customer
    const reservation = await prisma.reservation.create({
      data: {
        name,
        phone,
        email: email || session?.user?.email || "",
        guests: parseInt(guests),
        startsAt: requestedDate,
        duration: parseInt(duration) || 90,
        notes,
        restaurant: { connect: { id: 1 } },
        status: "PENDING",
        // ✅ Link to customer
        customer: { connect: { id: customer.id } },
        // ✅ Link to user if authenticated (for admin/WAITER)
        ...(session?.user?.id && ["ADMIN", "WAITER"].includes(session.user.role)
          ? { createdBy: { connect: { id: session.user.id } } }
          : {}),
      },
      // ✅ Include customer in response
      include: {
        customer: true,
      },
    });

    // ✅ Return success response
    return NextResponse.json(
      {
        message: "Reservation request submitted",
        reservation,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating reservation:", error);
    return NextResponse.json(
      { error: "Failed to create reservation" },
      { status: 500 }
    );
  }
}
