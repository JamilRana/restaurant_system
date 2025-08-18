// app/api/admin/delivery-zones/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const DeliveryZoneSchema = z.object({
  id: z.number().int().optional(),
  postcode: z.string().min(1).max(10),
  deliveryFee: z.number().nonnegative(),
});

type ApiResponse = {
  zones: {
    id: number;
    postcode: string;
    deliveryFee: number;
  }[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
};

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const restaurantId = session.user.restaurantId;
    if (!restaurantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;

    const [zones, totalCount] = await Promise.all([
      prisma.deliveryZone.findMany({
        where: { restaurantId },
        orderBy: { postcode: "asc" },
        skip: offset,
        take: limit,
      }),
      prisma.deliveryZone.count({ where: { restaurantId } }), // ✅ Fixed: was category
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    const response: ApiResponse = {
      zones,
      totalCount,
      totalPages,
      currentPage: page,
    };

    return NextResponse.json(response); // ✅ Fixed: was sending `zones`
  } catch (error) {
    console.error("GET /api/admin/delivery-zones", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const restaurantId = session.user.restaurantId;
    if (!restaurantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await req.json();
    const validated = DeliveryZoneSchema.parse(json);

    const existing = await prisma.deliveryZone.findFirst({
      where: { postcode: validated.postcode, restaurantId },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Postcode already exists" },
        { status: 409 }
      );
    }

    const zone = await prisma.deliveryZone.create({
      data: {
        postcode: validated.postcode,
        deliveryFee: validated.deliveryFee,
        restaurant: { connect: { id: restaurantId } },
      },
    });

    return NextResponse.json(zone, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("POST /api/admin/delivery-zones", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const restaurantId = session.user.restaurantId;
    if (!restaurantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await req.json();
    const { id, ...data } = DeliveryZoneSchema.parse(json);

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const zone = await prisma.deliveryZone.findUnique({ where: { id } });
    if (!zone || zone.restaurantId !== restaurantId) {
      return NextResponse.json({ error: "Zone not found" }, { status: 404 });
    }

    if (data.postcode !== zone.postcode) {
      const existing = await prisma.deliveryZone.findFirst({
        where: { postcode: data.postcode, restaurantId },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Postcode already exists" },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.deliveryZone.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }
    console.error("PUT /api/admin/delivery-zones", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id || isNaN(Number(id))) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const zoneId = parseInt(id);
    const zone = await prisma.deliveryZone.findUnique({
      where: { id: zoneId },
    });

    if (!zone || zone.restaurantId !== session.user.restaurantId) {
      return NextResponse.json({ error: "Zone not found" }, { status: 404 });
    }

    await prisma.deliveryZone.delete({ where: { id: zoneId } });
    return NextResponse.json({ message: "Zone deleted" });
  } catch (error) {
    console.error("DELETE /api/admin/delivery-zones", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
