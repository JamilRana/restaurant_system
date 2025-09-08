import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const restaurantId = 1;

    const zones = await prisma.deliveryZone.findMany({
      where: { restaurantId },
      select: { postcode: true },
      orderBy: { postcode: "asc" },
    });

    // Normalize postcodes: trim, uppercase, add space if missing
    const normalizedPostcodes = zones.map((z) => {
      let pc = z.postcode.trim();
      // Add space between outward and inward code
      if (pc.length >= 5 && !pc.includes(" ")) {
        pc = pc.slice(0, 3) + " " + pc.slice(3);
      }
      return pc.toUpperCase();
    });

    return NextResponse.json({ postcodes: normalizedPostcodes });
  } catch (error) {
    console.error("Failed to load postcodes:", error);
    return NextResponse.json(
      { error: "Failed to load delivery postcodes" },
      { status: 500 }
    );
  }
}
