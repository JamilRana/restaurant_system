// app/api/delivery-fee/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const postcode = searchParams.get("postcode");

  if (!postcode) {
    return NextResponse.json({ error: "Postcode required" }, { status: 400 });
  }

  try {
    const zone = await prisma.deliveryZone.findFirst({
      where: { postcode: postcode},
    });

    return NextResponse.json({
      deliveryFee: zone?.deliveryFee || 0,
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch fee" }, { status: 500 });
  }
}