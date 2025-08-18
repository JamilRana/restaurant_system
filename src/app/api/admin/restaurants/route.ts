// app/api/admin/restaurants/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { randomBytes } from "crypto";

// Ensure upload directory exists
const UPLOAD_DIR = path.join(process.cwd(), "public", "logo");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

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
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    return NextResponse.json(restaurant);
  } catch (error) {
    console.error("GET /api/admin/restaurants", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
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
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    let logoPath = restaurant.logoPath;

    if (file) {
      const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!validTypes.includes(file.type)) {
        return NextResponse.json({ error: "Invalid image type" }, { status: 400 });
      }

             const bytes = await file.arrayBuffer();
                  const uint8Array = new Uint8Array(bytes);
                  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
                  const filename = `category_${randomBytes(8).toString("hex")}.${ext}`;
                  const filepath = path.join(UPLOAD_DIR, filename);
            
                  try {
                    await fs.promises.writeFile(filepath, uint8Array);
                    logoPath = `/logo/${filename}`;
                  } catch (err) {
                    console.error("File write error:", err);
                    return NextResponse.json({ error: "Failed to save image" }, { status: 500 });
                  }

      // Remove old logo
      if (restaurant.logoPath) {
        const oldPath = path.join(process.cwd(), "public", restaurant.logoPath);
        if (fs.existsSync(oldPath)) {
          await fs.promises.unlink(oldPath);
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
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// ✅ Required for file system access
export const runtime = "nodejs";