// app/api/admin/food/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Schema updates
const FoodOptionSchema = z.object({
  name: z.string().min(1),
  price: z.number().nonnegative(),
});

const FoodSchema = z.object({
  id: z.number().int().optional(),
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().nullable(),
  price: z.number().positive("Price must be positive"),
  categoryId: z.number().int(),
  available: z.boolean().default(true),
  options: z.array(FoodOptionSchema).optional(),
});

type ApiResponse = {
  foods: {
    id: number;
    name: string;
    description: string | null;
    price: number;
    image: string | null;
    available: boolean;
    categoryId: number;
    categoryName: string;
    options: { id: number; name: string; price: number }[];
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

    // Build where clause
    let where: any = { restaurantId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { category: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    // Get foods with category names and options
    const [foods, totalCount] = await Promise.all([
      prisma.food.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          image: true,
          available: true,
          categoryId: true,
          category: { select: { name: true } },
          options: { select: { id: true, name: true, price: true } },
          createdAt: true,
        },
        orderBy: { name: "asc" },
        skip: offset,
        take: limit,
      }),
      prisma.food.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    const response: ApiResponse = {
      foods: foods.map((food) => ({
        ...food,
        categoryName: food.category.name,
        price: Number(food.price),
        options: food.options.map((opt) => ({
          id: opt.id,
          name: opt.name,
          price: Number(opt.price),
        })),
        createdAt: food.createdAt.toISOString(),
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
    if (!restaurantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const name = formData.get("name");
    const description = formData.get("description");
    const price = parseFloat(formData.get("price") as string);
    const categoryId = parseInt(formData.get("categoryId") as string);
    const available = formData.get("available") === "true";

    // Parse options from form data
    const options: { name: string; price: number }[] = [];
    let optionIndex = 0;
    while (true) {
      const name = formData.get(`options[${optionIndex}].name`);
      const priceStr = formData.get(`options[${optionIndex}].price`);

      if (!name || !priceStr) break;

      options.push({
        name: name as string,
        price: parseFloat(priceStr as string),
      });
      optionIndex++;
    }

    const parsed = FoodSchema.safeParse({
      name,
      description,
      price,
      categoryId,
      available,
      options,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Verify category belongs to restaurant
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        restaurantId,
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Category not found or doesn't belong to your restaurant" },
        { status: 404 }
      );
    }

    // Create food with options in a transaction
    const food = await prisma.$transaction(async (tx) => {
      // Create the food
      const createdFood = await tx.food.create({
        data: {
          name: data.name,
          description: data.description,
          price: data.price,
          available: data.available,
          categoryId: data.categoryId,
          restaurantId: restaurantId,
        },
      });

      // Create options if provided
      if (data.options && data.options.length > 0) {
        await tx.foodOption.createMany({
          data: data.options.map((opt) => ({
            name: opt.name,
            price: opt.price,
            foodId: createdFood.id,
          })),
        });
      }

      return createdFood;
    });

    return NextResponse.json(food, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/food", error);
    return NextResponse.json(
      { error: "Failed to create food item" },
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
    const description = formData.get("description");
    const price = parseFloat(formData.get("price") as string);
    const categoryId = parseInt(formData.get("categoryId") as string);
    const available = formData.get("available") === "true";

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // Parse options from form data
    const options: { name: string; price: number }[] = [];
    let optionIndex = 0;
    while (true) {
      const name = formData.get(`options[${optionIndex}].name`);
      const priceStr = formData.get(`options[${optionIndex}].price`);

      if (!name || !priceStr) break;

      options.push({
        name: name as string,
        price: parseFloat(priceStr as string),
      });
      optionIndex++;
    }

    const parsed = FoodSchema.safeParse({
      id,
      name,
      description,
      price,
      categoryId,
      available,
      options,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const data = parsed.data;

    const food = await prisma.food.findUnique({ where: { id } });
    if (!food || food.restaurantId !== restaurantId) {
      return NextResponse.json(
        { error: "Food item not found" },
        { status: 404 }
      );
    }

    // Verify category belongs to restaurant
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        restaurantId,
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Category not found or doesn't belong to your restaurant" },
        { status: 404 }
      );
    }

    // Update food and options in a transaction
    const updated = await prisma.$transaction(async (tx) => {
      // Update the food
      const updatedFood = await tx.food.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          price: data.price,
          available: data.available,
          categoryId: data.categoryId,
        },
      });

      // Delete existing options
      await tx.foodOption.deleteMany({
        where: { foodId: id },
      });

      // Create new options if provided
      if (data.options && data.options.length > 0) {
        await tx.foodOption.createMany({
          data: data.options.map((opt) => ({
            name: opt.name,
            price: opt.price,
            foodId: id,
          })),
        });
      }

      return updatedFood;
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/admin/food", error);
    return NextResponse.json(
      { error: "Failed to update food item" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { foodId, available } = await req.json();

    if (!foodId) {
      return NextResponse.json({ error: "Food ID required" }, { status: 400 });
    }

    // Verify category belongs to restaurant
    const food = await prisma.food.findUnique({
      where: { id: foodId },
    });

    if (!food || food.restaurantId !== session.user.restaurantId) {
      return NextResponse.json(
        { error: "Food Item not found" },
        { status: 404 }
      );
    }

    // Update availability
    const updated = await prisma.food.update({
      where: { id: foodId },
      data: { available: Boolean(available) },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/admin/food", error);
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

    const food = await prisma.food.findUnique({ where: { id } });
    if (!food || food.restaurantId !== restaurantId) {
      return NextResponse.json(
        { error: "Food item not found" },
        { status: 404 }
      );
    }

    await prisma.food.delete({ where: { id } });
    return NextResponse.json({ message: "Food item deleted successfully." });
  } catch (error) {
    console.error("DELETE /api/admin/food", error);
    return NextResponse.json(
      { error: "Failed to delete food item" },
      { status: 500 }
    );
  }
}
