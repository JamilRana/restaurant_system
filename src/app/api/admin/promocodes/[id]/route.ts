// app/api/admin/promocodes/[id]/route.ts
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/authOptions";
import { NextResponse } from "next/server";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pramid = await params;
  const id = parseInt(pramid.id);

  const data = await request.json();

  try {
    const updated = await prisma.promoCode.update({
      where: { id },
      data: {
        code: data.code.trim().toUpperCase(),
        discountPercent: data.discountPercent || null,
        discountAmount: data.discountAmount || null,
        minOrderAmount: data.minOrderAmount || null,
        maxUses: data.maxUses || null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        active: data.active ?? true,
        restaurantId: data.restaurantId || null,
      },
    });
    return NextResponse.json(updated);
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Promo code not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pramid = await params;
  const id = parseInt(pramid.id);

  try {
    await prisma.promoCode.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Promo code not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
