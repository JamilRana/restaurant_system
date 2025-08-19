// app/api/admin/category/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import sharp from "sharp";
import { put } from "@vercel/blob";
import { v4 as uuidv4 } from "uuid";

// Upload config
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const VALID_TYPES = ["image/jpeg", "image/png", "image/webp"];
const THUMBNAIL_SIZE = { width: 800, height: 600 };

// Schema
const CategorySchema = z.object({
  id: z.number().int().optional(),
  name: z.string().min(1, "Name is required").max(50),
});

type ApiResponse = {
  categories: {
    id: number;
    name: string;
    image: string | null;
    createdAt: string;
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
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;
    const search = searchParams.get("search") || "";

    if (!restaurantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const where: any = { restaurantId };
    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    const [categories, totalCount] = await Promise.all([
      prisma.category.findMany({
        where,
        select: { id: true, name: true, image: true, createdAt: true },
        orderBy: { name: "asc" },
        skip: offset,
        take: limit,
      }),
      prisma.category.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    const response: ApiResponse = {
      categories: categories.map((cat) => ({
        ...cat,
        createdAt: cat.createdAt.toISOString(),
      })),
      totalCount,
      totalPages,
      currentPage: page,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("GET /api/admin/category", error);
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

    const formData = await req.formData();
    const name = formData.get("name");
    const file = formData.get("image") as File | null;

    const parsed = CategorySchema.safeParse({ name });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid name", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const categoryName = parsed.data.name;

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });

    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 }
      );
    }

    const existing = await prisma.category.findFirst({
      where: {
        name: { mode: "insensitive", equals: categoryName },
        restaurantId,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A category with this name already exists." },
        { status: 409 }
      );
    }

    let image: string | null = null;

    if (file) {
      if (!VALID_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: "Only JPG, PNG, WebP images allowed." },
          { status: 400 }
        );
      }

      if (file.size > MAX_SIZE) {
        return NextResponse.json(
          { error: "Image must be under 5MB." },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());

      // Resize in memory
      const resizedBuffer = await sharp(buffer)
        .resize(THUMBNAIL_SIZE.width, THUMBNAIL_SIZE.height, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 80 })
        .png({ compressionLevel: 6 })
        .webp({ quality: 80 })
        .toBuffer();

      const ext = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
      const filename = `${categoryName.replace(
        /\s+/g,
        "_"
      )}_${Date.now()}.${ext}`;

      // Upload to Vercel Blob
      const blob = await put(`categories/${filename}`, resizedBuffer, {
        access: "public",
      });

      image = blob.url;
    }

    const category = await prisma.category.create({
      data: {
        name: categoryName,
        image,
        restaurant: { connect: { id: restaurantId } },
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/category", error);
    return NextResponse.json(
      { error: "Failed to create category" },
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

    const formData = await req.formData();
    const id = Number(formData.get("id"));
    const name = formData.get("name");
    const file = formData.get("image") as File | null;

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const parsed = CategorySchema.safeParse({ name });
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid name" }, { status: 400 });
    }

    const category = await prisma.category.findUnique({ where: { id } });
    if (!category || category.restaurantId !== restaurantId) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    const existing = await prisma.category.findFirst({
      where: {
        name: { mode: "insensitive", equals: parsed.data.name },
        restaurantId,
        NOT: { id },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Another category has this name." },
        { status: 409 }
      );
    }

    let image = category.image;

    if (file) {
      // Delete old blob if exists
      if (category.image) {
        try {
          await fetch(category.image, { method: "DELETE" });
        } catch (err) {
          console.warn("Failed to delete old image from Blob", err);
        }
      }

      const buffer = Buffer.from(await file.arrayBuffer());

      const resizedBuffer = await sharp(buffer)
        .resize(THUMBNAIL_SIZE.width, THUMBNAIL_SIZE.height, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 80 })
        .png({ compressionLevel: 6 })
        .webp({ quality: 80 })
        .toBuffer();

      const ext = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
      const filename = `cat_${Date.now()}_${uuidv4()}.${ext}`;

      const blob = await put(`categories/${filename}`, resizedBuffer, {
        access: "public",
      });

      image = blob.url;
    }

    const updated = await prisma.category.update({
      where: { id },
      data: { name: parsed.data.name, image },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/admin/category", error);
    return NextResponse.json(
      { error: "Failed to update category" },
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

    const restaurantId = session.user.restaurantId;
    if (!restaurantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const category = await prisma.category.findUnique({ where: { id } });
    if (!category || category.restaurantId !== restaurantId) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    // Delete image from Blob
    if (category.image) {
      try {
        await fetch(category.image, { method: "DELETE" });
      } catch (err) {
        console.warn("Failed to delete image from Blob", err);
      }
    }

    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ message: "Category deleted successfully." });
  } catch (error) {
    console.error("DELETE /api/admin/category", error);
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
