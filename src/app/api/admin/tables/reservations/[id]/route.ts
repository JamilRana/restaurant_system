import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/notifications/email";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const reservationId = parseInt(id, 10);

  const body = await req.json();
  const { status, tableIds = [] } = body;

  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { tables: true },
  });

  if (!reservation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let updateData: any = { status };
  const currentTableIds = reservation.tables.map((t) => t.tableId);

  // ✅ Confirmed -> assign tables
  if (status === "CONFIRMED") {
    if (tableIds.length > 0) {
      const tables = await prisma.table.findMany({
        where: { id: { in: tableIds } },
      });

      const available = tables.filter((t) => t.status === "AVAILABLE");
      if (available.length !== tableIds.length) {
        return NextResponse.json(
          { error: "One or more tables not available" },
          { status: 400 }
        );
      }

      await prisma.$transaction([
        // release previously assigned tables
        ...currentTableIds.map((id) =>
          prisma.table.update({ where: { id }, data: { status: "AVAILABLE" } })
        ),
        // reserve the new tables
        ...tableIds.map((id: number) =>
          prisma.table.update({ where: { id }, data: { status: "RESERVED" } })
        ),
        // reset ReservationTable join
        prisma.reservationTable.deleteMany({ where: { reservationId } }),
        prisma.reservation.update({
          where: { id: reservationId },
          data: {
            status,
            tables: {
              create: tableIds.map((id: number) => ({ tableId: id })),
            },
          },
        }),
      ]);
    }
  }

  // ✅ Completed or Cancelled -> release all
  if (status === "COMPLETED" || status === "CANCELLED") {
    await prisma.$transaction([
      ...currentTableIds.map((id) =>
        prisma.table.update({ where: { id }, data: { status: "AVAILABLE" } })
      ),
      prisma.reservationTable.deleteMany({ where: { reservationId } }),
      prisma.reservation.update({
        where: { id: reservationId },
        data: { status },
      }),
    ]);
  }

  const updated = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { tables: { include: { table: { select: { number: true } } } } },
  });
  if (status === "CONFIRMED" || status === "CANCELLED") {
    try {
      await sendEmail({
        to: reservation.email || "",
        subject: `Reservation ${status}`,
        text: `Hi ${
          reservation.name
        },\n\nYour reservation has been ${status.toLowerCase()}.\nTime: ${new Date(
          reservation.startsAt
        ).toLocaleString()}`,
      });
    } catch (err) {
      console.error("Email failed:", err);
    }
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const reservationId = parseInt(id);

  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { tables: true },
  });

  if (!reservation)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Release tables
  if (reservation.tables.length > 0) {
    await prisma.$transaction(
      reservation.tables.map((t) =>
        prisma.table.update({
          where: { id: t.tableId },
          data: { status: "AVAILABLE" },
        })
      )
    );
  }

  await prisma.reservation.delete({ where: { id: reservationId } });
  return NextResponse.json({ success: true });
}
