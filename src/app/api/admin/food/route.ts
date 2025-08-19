// app/api/admin/food/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { foodSchema } from "@/lib/schemas/foodSchema";
import sharp from "sharp";
import { put, del } from "@vercel/blob";
import { v4 as uuidv4 } from "uuid";

// Upload config
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const VALID_TYPES = ["image/jpeg", "image/png", "image/webp"];
const THUMBNAIL_SIZE = { width: 800, height: 600 };

type ApiResponse = {
  foods: Array<{
    id: number;
    name: string;
    description: string | null;
    price: number;
    image: string | null;
    available: boolean;
    categoryId: number;
    categoryName: string;
    options: { name: string; price: number }[];
    createdAt: string;
  }>;
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

    const [foods, totalCount] = await Promise.all([
      prisma.food.findMany({
        where: { restaurantId },
        include: {
          category: { select: { name: true } },
          options: true,
        },
        orderBy: { name: "asc" },
        skip: offset,
        take: limit,
      }),
      prisma.food.count({ where: { restaurantId } }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    const response: ApiResponse = {
      foods: foods.map((f) => ({
        id: f.id,
        name: f.name,
        description: f.description,
        price: f.price,
        image: f.image,
        available: f.available,
        categoryId: f.categoryId,
        categoryName: f.category.name,
        options: f.options.map((o) => ({ name: o.name, price: o.price })),
        createdAt: f.createdAt.toISOString(),
      })),
      totalCount,
      totalPages,
      currentPage: page,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("GET /api/admin/food", error);
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
    const formData = await req.formData();
    const name = formData.get("name") as string;
    const description = formData.get("description") as string | null;
    const price = Number(formData.get("price"));
    const categoryId = Number(formData.get("categoryId"));
    const available = formData.get("available") === "true";
    const file = formData.get("image") as File | null;

    const parsed = foodSchema.safeParse({
      name,
      description: description || null,
      price,
      categoryId,
      available,
      options: [],
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Check category belongs to restaurant
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category || category.restaurantId !== restaurantId) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    // Case-insensitive duplicate check
    const existing = await prisma.food.findFirst({
      where: {
        name: { mode: "insensitive", equals: name },
        restaurantId,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A food item with this name already exists." },
        { status: 409 }
      );
    }

    let image: string | null = null;

    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      if (!VALID_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: "Invalid image type" },
          { status: 400 }
        );
      }
      if (file.size > MAX_SIZE) {
        return NextResponse.json({ error: "Image too large" }, { status: 400 });
      }

      // Resize in memory
      const resizedBuffer = await sharp(buffer)
        .resize(THUMBNAIL_SIZE.width, THUMBNAIL_SIZE.height, { fit: "inside" })
        .jpeg({ quality: 80 })
        .png({ compressionLevel: 6 })
        .webp({ quality: 80 })
        .toBuffer();

      const ext = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
      const filename = `${name.replace(/\W+/g, "_")}_${Date.now()}.${ext}`;

      // Upload to Vercel Blob
      const blob = await put(`foods/${filename}`, resizedBuffer, {
        access: "public",
      });

      image = blob.url;
    }

    const food = await prisma.food.create({
      data: {
        name,
        description,
        price,
        image,
        available,
        category: { connect: { id: categoryId } },
        restaurant: { connect: { id: restaurantId } },
      },
    });

    // Add options
    const options: Array<{ name: string; price: number }> = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("options[")) {
        const match = key.match(/options\[(\d+)\]\.(name|price)/);
        if (match) {
          const idx = parseInt(match[1]);
          const field = match[2];
          if (!options[idx]) options[idx] = { name: "", price: 0 };
          if (field === "name") options[idx].name = value as string;
          else options[idx].price = Number(value);
        }
      }
    }

    await prisma.foodOption.createMany({
      data: options
        .filter((o) => o.name)
        .map((o) => ({ name: o.name, price: o.price, foodId: food.id })),
    });

    return NextResponse.json(food, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/food", error);
    return NextResponse.json(
      { error: "Failed to create food" },
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
    const formData = await req.formData();
    const id = Number(formData.get("id"));
    const name = formData.get("name") as string;
    const description = formData.get("description") as string | null;
    const price = Number(formData.get("price"));
    const categoryId = Number(formData.get("categoryId"));
    const available = formData.get("available") === "true";
    const file = formData.get("image") as File | null;

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const parsed = foodSchema.safeParse({
      name,
      description,
      price,
      categoryId,
      available,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const food = await prisma.food.findUnique({ where: { id } });
    if (!food || food.restaurantId !== restaurantId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const existing = await prisma.food.findFirst({
      where: {
        name: { mode: "insensitive", equals: name },
        restaurantId,
        NOT: { id },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Another food has this name." },
        { status: 409 }
      );
    }

    let image = food.image;

    if (file) {
      // Delete old blob
      if (food.image) {
        try {
          await del(food.image);
        } catch (err) {
          console.warn("Failed to delete old image from Blob", err);
        }
      }

      const buffer = Buffer.from(await file.arrayBuffer());

      const resizedBuffer = await sharp(buffer)
        .resize(THUMBNAIL_SIZE.width, THUMBNAIL_SIZE.height, { fit: "inside" })
        .jpeg({ quality: 80 })
        .png({ compressionLevel: 6 })
        .webp({ quality: 80 })
        .toBuffer();

      const ext = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
      const filename = `food_${uuidv4()}.${ext}`;

      const blob = await put(`foods/${filename}`, resizedBuffer, {
        access: "public",
      });

      image = blob.url;
    }

    const updated = await prisma.food.update({
      where: { id },
      data: {
        name,
        description,
        price,
        image,
        available,
        categoryId,
      },
    });

    // Update options: delete and recreate
    await prisma.foodOption.deleteMany({ where: { foodId: id } });

    const options: Array<{ name: string; price: number }> = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("options[")) {
        const match = key.match(/options\[(\d+)\]\.(name|price)/);
        if (match) {
          const idx = parseInt(match[1]);
          const field = match[2];
          if (!options[idx]) options[idx] = { name: "", price: 0 };
          if (field === "name") options[idx].name = value as string;
          else options[idx].price = Number(value);
        }
      }
    }

    if (options.length > 0) {
      await prisma.foodOption.createMany({
        data: options
          .filter((o) => o.name)
          .map((o) => ({ name: o.name, price: o.price, foodId: id })),
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/admin/food", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const restaurantId = session.user.restaurantId;
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const food = await prisma.food.findUnique({ where: { id } });
    if (!food || food.restaurantId !== restaurantId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Delete image from Blob
    if (food.image) {
      try {
        await del(food.image);
      } catch (err) {
        console.warn("Failed to delete image from Blob", err);
      }
    }

    await prisma.foodOption.deleteMany({ where: { foodId: id } });
    await prisma.food.delete({ where: { id } });

    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/admin/food", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}

export const runtime = "nodejs";
