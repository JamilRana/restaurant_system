// app/api/admin/tables/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const TableSchema = z.object({
  id: z.number().int().optional(),
  number: z.string().min(1),
  capacity: z.number().int().positive(),
  location: z.string().optional(),
});

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (
      !session ||
      !["ADMIN", "WAITER", "KITCHEN"].includes(session.user.role)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const restaurantId = session.user.restaurantId; // Use real ID
    if (!restaurantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    // Base WHERE clause
    const where: any = { restaurantId };
    if (search) {
      where.number = { contains: search, mode: "insensitive" };
    }
    if (status) {
      where.status = status;
    }

    // Fetch paginated tables
    const [tables, totalCount] = await Promise.all([
      prisma.table.findMany({
        where,
        orderBy: { number: "asc" },
        skip: offset,
        take: limit,
      }),
      prisma.table.count({ where }),
    ]);

    // ✅ Fetch full counts for stats (ignore pagination & search for this)
    const fullWhere = { restaurantId }; // All tables in restaurant
    const [availableCount, occupiedCount, reservedCount, cleaningCount] =
      await Promise.all([
        prisma.table.count({
          where: { ...fullWhere, status: "AVAILABLE" },
        }),
        prisma.table.count({
          where: { ...fullWhere, status: "OCCUPIED" },
        }),
        prisma.table.count({
          where: { ...fullWhere, status: "RESERVED" },
        }),
        prisma.table.count({
          where: { ...fullWhere, status: "CLEANING" },
        }),
      ]);

    const totalPages = Math.ceil(totalCount / limit);

    const response = {
      tables: tables.map((table) => ({
        ...table,
        createdAt: table.createdAt.toISOString(),
      })),
      totalCount,
      totalPages,
      currentPage: page,
      stats: {
        total: totalCount,
        available: availableCount,
        occupied: occupiedCount,
        reserved: reservedCount,
        cleaning: cleaningCount,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("GET /api/admin/tables", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = await request.json();
  const parsed = TableSchema.safeParse(data);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const restaurantId = session.user.restaurantId;
  if (!restaurantId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const existing = await prisma.table.findFirst({
      where: {
        number: parsed.data.number,
        restaurantId,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Table number already exists in this restaurant" },
        { status: 409 }
      );
    }

    const table = await prisma.table.create({
      data: {
        number: parsed.data.number,
        location: parsed.data.location,
        capacity: parsed.data.capacity,
        restaurant: { connect: { id: restaurantId } },
      },
    });

    return NextResponse.json(table, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/admin/tables", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id"));
  if (isNaN(id))
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const data = await request.json();
  const parsed = TableSchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  try {
    const table = await prisma.table.findUnique({ where: { id } });
    if (!table || table.restaurantId !== session.user.restaurantId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Check for duplicate number
    const duplicate = await prisma.table.findFirst({
      where: {
        number: parsed.data.number,
        restaurantId: session.user.restaurantId,
        id: { not: id },
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: "Another table has this number" },
        { status: 409 }
      );
    }

    const updated = await prisma.table.update({
      where: { id },
      data: {
        number: parsed.data.number,
        location: parsed.data.location,
        capacity: parsed.data.capacity,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("PUT /api/admin/tables", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id"));
  if (isNaN(id))
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    const table = await prisma.table.findUnique({ where: { id } });
    if (!table || table.restaurantId !== session.user.restaurantId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.table.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    console.error("DELETE /api/admin/tables", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let tableId: number;
  let status: string;

  try {
    const body = await request.json();
    tableId = body.tableId;
    status = body.status;

    if (!tableId || !status) {
      return NextResponse.json(
        { error: "Missing tableId or status" },
        { status: 400 }
      );
    }

    if (typeof tableId !== "number" || isNaN(tableId)) {
      return NextResponse.json({ error: "Invalid tableId" }, { status: 400 });
    }

    const validStatuses = ["AVAILABLE", "OCCUPIED", "RESERVED", "CLEANING"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const table = await prisma.table.findUnique({
      where: { id: tableId },
    });

    if (!table || table.restaurantId !== session.user.restaurantId) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    const updated = await prisma.table.update({
      where: { id: tableId },
      data: {
        status: status as "AVAILABLE" | "OCCUPIED" | "RESERVED" | "CLEANING",
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/admin/tables/status", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
