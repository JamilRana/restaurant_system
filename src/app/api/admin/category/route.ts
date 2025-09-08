// app/api/admin/category/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Schema
const CategorySchema = z.object({
  id: z.number().int().optional(),
  name: z.string().min(1, "Name is required").max(50),
});

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

    // Build where clause
    const where: any = { restaurantId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        {
          foods: {
            some: {
              name: { contains: search, mode: "insensitive" },
            },
          },
        },
      ];
    }

    // Get categories with food count
    const [categories, totalCount] = await Promise.all([
      prisma.category.findMany({
        where,
        select: {
          id: true,
          name: true,
          image: true,
          createdAt: true,
          available: true,
          foods: {
            select: { id: true },
          },
        },
        orderBy: { name: "asc" },
        skip: offset,
        take: limit,
      }),
      prisma.category.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    const response = {
      categories: categories.map((cat) => ({
        ...cat,
        createdAt: cat.createdAt.toISOString(),
        foodCount: cat.foods.length,
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
    const available = true;

    const parsed = CategorySchema.safeParse({ name });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid name", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const categoryName = parsed.data.name;

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

    const category = await prisma.category.create({
      data: {
        name: categoryName,
        available: available,
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

    const updated = await prisma.category.update({
      where: { id },
      data: { name: parsed.data.name },
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

// PATCH for availability toggle
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { categoryId, available } = await req.json();

    if (!categoryId) {
      return NextResponse.json(
        { error: "Category ID required" },
        { status: 400 }
      );
    }

    // Verify category belongs to restaurant
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category || category.restaurantId !== session.user.restaurantId) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    // Update availability
    const updated = await prisma.category.update({
      where: { id: categoryId },
      data: { available: Boolean(available) },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/admin/category", error);
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
