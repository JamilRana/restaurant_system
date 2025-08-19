// app/api/admin/restaurants/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { put, del } from "@vercel/blob";
import { v4 as uuidv4 } from "uuid";

// Valid image types
const VALID_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const restaurant = await prisma.restaurant.findFirst({
      select: {
        id: true,
        name: true,
        email: true,
        address: true,
        logoPath: true,
        deliveryTime: true,
        collectionTime: true,
      },
    });

    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(restaurant);
  } catch (error) {
    console.error("GET /api/admin/restaurants", error);
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

    const formData = await req.formData();
    const deliveryTime = formData.get("deliveryTime") as string;
    const collectionTime = formData.get("collectionTime") as string;
    const file = formData.get("logo") as File | null;

    if (!deliveryTime || !collectionTime) {
      return NextResponse.json(
        { error: "Delivery and collection time are required" },
        { status: 400 }
      );
    }

    const restaurant = await prisma.restaurant.findFirst();
    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 }
      );
    }

    let logoPath = restaurant.logoPath;

    if (file) {
      if (!VALID_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: "Invalid image type" },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filename = `logo_${uuidv4()}.${ext}`;

      // Upload to Vercel Blob
      const blob = await put(`logos/${filename}`, buffer, {
        access: "public",
      });

      logoPath = blob.url;

      // Delete old logo from Blob
      if (restaurant.logoPath) {
        try {
          await del(restaurant.logoPath);
        } catch (err) {
          console.warn("Failed to delete old logo from Blob", err);
        }
      }
    }

    const updated = await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: {
        logoPath,
        deliveryTime,
        collectionTime,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/admin/restaurants", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// Required for file system access (but we're not using fs anymore)
export const runtime = "nodejs";
