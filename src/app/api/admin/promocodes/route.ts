// app/api/admin/promocodes/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

type ApiResponse = {
  promos: {
    id: number;
    code: string;
    discountPercent: number | null;
    discountAmount: number | null;
    minOrderAmount: number | null;
    maxUses: number | null;
    currentUses: number;
    expiresAt: string | null;
    active: boolean;
    createdAt: string;
  }[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
};

// app/api/admin/promocodes/route.ts

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const search = searchParams.get("search") || "";
  const dateFrom = searchParams.get("dateFrom")
    ? new Date(searchParams.get("dateFrom")!)
    : null;
  const dateTo = searchParams.get("dateTo")
    ? new Date(searchParams.get("dateTo")!)
    : null;

  const offset = (page - 1) * limit;
  const restaurantId = session.user.restaurantId;

  try {
    const whereClause: any = { restaurantId };

    if (search) {
      whereClause.code = { contains: search, mode: "insensitive" };
    }

    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) whereClause.createdAt.gte = dateFrom;
      if (dateTo)
        whereClause.createdAt.lte = new Date(dateTo.setHours(23, 59, 59));
    }

    // ✅ Debug: Log the where clause
    console.log("PromoCode WHERE:", whereClause);

    const [promos, totalCount] = await Promise.all([
      prisma.promoCode.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
      prisma.promoCode.count({ where: whereClause }),
    ]);

    console.log("Fetched promos:", promos.length); // ✅ Debug

    const totalPages = Math.ceil(totalCount / limit);

    const response = {
      promos: promos.map((p) => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
        expiresAt: p.expiresAt?.toISOString() || null,
      })),
      totalCount,
      totalPages,
      currentPage: page,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("GET /api/admin/promocodes", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

// app/api/admin/promocodes/route.ts

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const restaurantId = session.user.restaurantId;
  if (!restaurantId) {
    return NextResponse.json(
      { error: "Admin must belong to a restaurant" },
      { status: 400 }
    );
  }

  const formData = await request.formData();

  const code = formData.get("code")?.toString().trim().toUpperCase();
  const discountPercent = formData.get("discountPercent");
  const discountAmount = formData.get("discountAmount");
  const minOrderAmount = formData.get("minOrderAmount");
  const maxUses = formData.get("maxUses");
  const expiresAt = formData.get("expiresAt")?.toString();
  const active =
    formData.get("active") === "on" || formData.get("active") === "true";

  // Validation
  if (!code) {
    return NextResponse.json(
      { error: "Promo code is required" },
      { status: 400 }
    );
  }
  if (!discountPercent && !discountAmount) {
    return NextResponse.json(
      { error: "Either discount percent or amount is required" },
      { status: 400 }
    );
  }

  try {
    // Check for duplicates in this restaurant
    const existing = await prisma.promoCode.findFirst({
      where: {
        code,
        restaurantId, // ✅ Scoped to restaurant
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A promo code with this code already exists." },
        { status: 409 }
      );
    }

    // ✅ Create with restaurant connection
    const promo = await prisma.promoCode.create({
      data: {
        code,
        discountPercent: discountPercent
          ? parseFloat(discountPercent as string)
          : null,
        discountAmount: discountAmount
          ? parseFloat(discountAmount as string)
          : null,
        minOrderAmount: minOrderAmount
          ? parseFloat(minOrderAmount as string)
          : null,
        maxUses: maxUses ? parseInt(maxUses as string, 10) : null,
        currentUses: 0,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        active,
        restaurant: {
          connect: { id: restaurantId }, // ✅ Connect to restaurant
        },
      },
    });

    return NextResponse.json(promo, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/promocodes", error);
    return NextResponse.json(
      { error: "Failed to create promo code" },
      { status: 500 }
    );
  }
}
// PUT: Update existing promo code
// app/api/admin/promocodes/route.ts

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id")); // ✅ Using query param

  if (isNaN(id))
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const formData = await request.formData();
  const promo = await prisma.promoCode.findUnique({ where: { id } });

  if (!promo) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (promo.restaurantId !== session.user.restaurantId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Extract data
  const code = formData.get("code")?.toString().trim().toUpperCase();
  const discountPercent = formData.get("discountPercent");
  const discountAmount = formData.get("discountAmount");
  const minOrderAmount = formData.get("minOrderAmount");
  const maxUses = formData.get("maxUses");
  const expiresAt = formData.get("expiresAt")?.toString();
  const active =
    formData.get("active") === "true" || formData.get("active") === "on";

  // Prevent duplicate code
  if (code && code !== promo.code) {
    const existing = await prisma.promoCode.findFirst({
      where: { code, restaurantId: session.user.restaurantId },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A promo code with this code already exists." },
        { status: 409 }
      );
    }
  }

  try {
    const updated = await prisma.promoCode.update({
      where: { id },
      data: {
        code: code || promo.code,
        discountPercent: discountPercent
          ? parseFloat(discountPercent as string)
          : null,
        discountAmount: discountAmount
          ? parseFloat(discountAmount as string)
          : null,
        minOrderAmount: minOrderAmount
          ? parseFloat(minOrderAmount as string)
          : null,
        maxUses: maxUses ? parseInt(maxUses as string, 10) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        active,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/admin/promocodes", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
// DELETE: Delete a promo code
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id"));
  if (isNaN(id))
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const promo = await prisma.promoCode.findUnique({ where: { id } });
  if (!promo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (promo.restaurantId !== session.user.restaurantId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await prisma.promoCode.delete({ where: { id } });
    return NextResponse.json({ message: "Promo code deleted" });
  } catch (error) {
    console.error("DELETE /api/admin/promocodes", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}

export const runtime = "nodejs";
