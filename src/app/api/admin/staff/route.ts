// app/api/admin/staff/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const StaffSchema = z.object({
  id: z.number().int().optional(),
  name: z.string().min(1, "Name is required"),
  role: z.enum(["CHEF", "WAITER", "MANAGER", "CASHIER", "DELIVERY", "CLEANER", "OTHER"]),
   email: z
    .string()
    .email("Invalid email")
    .nullish()
    .transform((val) => (val === "" ? null : val)),
  phone: z
    .string()
    .nullish()
    .transform((val) => (val === "" ? null : val)),
   hireDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .optional(),
  salary: z.number().positive().optional().nullable(),
  hourlyRate: z.number().positive().optional().nullable(),
  salaryPeriod: z.enum(["HOURLY", "WEEKLY", "MONTHLY"]).optional().nullable(),
  active: z.boolean().optional(),
});

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const restaurantId = session.user.restaurantId;
  if (!restaurantId) {
    return NextResponse.json({ error: "No restaurant assigned" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 10;
  const offset = (page - 1) * limit;

  try {
    const where = {
      restaurantId,
      active: true,
      ...(search && {
        OR: [
          { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { email: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { phone: { contains: search, mode: Prisma.QueryMode.insensitive } },
        ],
      }),
    };

    const [staff, totalCount] = await prisma.$transaction([
      prisma.staff.findMany({
        where,
        select: {
          id: true,
          name: true,
          role: true,
          email: true,
          phone: true,
          hireDate: true,
          salary: true,
          hourlyRate: true,
          salaryPeriod: true,
          active: true,
        },
        orderBy: { name: "asc" },
        skip: offset,
        take: limit,
      }),
      prisma.staff.count({ where }),
    ]);

    return NextResponse.json({
      staff,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error("GET /api/admin/staff", error);
    return NextResponse.json({ error: "Failed to load staff" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const restaurantId = session.user.restaurantId;
  if (!restaurantId) {
    return NextResponse.json({ error: "No restaurant assigned" }, { status: 403 });
  }
  

  try {

    const data = await request.json();
    const parsed = StaffSchema.parse(data);

    if (parsed.email) {
      const existing = await prisma.staff.findFirst({
        where: { email: parsed.email, restaurantId },
      });
      if (existing) {
        return NextResponse.json({ error: "Email already in use" }, { status: 409 });
      }
    }

    const newStaff = await prisma.staff.create({
      data: {
        name: parsed.name,
        role: parsed.role,
        email: parsed.email,
        phone: parsed.phone,
        hireDate: parsed.hireDate ? new Date(parsed.hireDate) : new Date(),
        salary: parsed.salary,
        hourlyRate: parsed.hourlyRate,
        salaryPeriod: parsed.salaryPeriod,
        active: parsed.active ?? true,
        restaurant: { connect: { id: restaurantId } },
      },
    });

    return NextResponse.json(newStaff, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
  return NextResponse.json(
    {
      error: "Validation failed",
      details: error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    },
    { status: 400 }
  );
}
    console.error("POST /api/admin/staff", error);
    return NextResponse.json({ error: "Failed to create staff" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const restaurantId = session.user.restaurantId;
  if (!restaurantId) {
    return NextResponse.json({ error: "No restaurant assigned" }, { status: 403 });
  }

  try {
    const data = await request.json();
    const parsed = StaffSchema.parse(data);

    if (!parsed.id) {
      return NextResponse.json({ error: "Staff ID is required" }, { status: 400 });
    }

    const staff = await prisma.staff.findUnique({ where: { id: parsed.id } });
    if (!staff || staff.restaurantId !== restaurantId) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    if (parsed.email && parsed.email !== staff.email) {
      const existing = await prisma.staff.findFirst({
        where: { email: parsed.email, restaurantId },
      });
      if (existing) {
        return NextResponse.json({ error: "Email already in use" }, { status: 409 });
      }
    }

    const updated = await prisma.staff.update({
      where: { id: parsed.id },
       data:{
        name: parsed.name,
        role: parsed.role,
        email: parsed.email,
        phone: parsed.phone,
        hireDate: parsed.hireDate ? new Date(parsed.hireDate) : staff.hireDate,
        salary: parsed.salary,
        hourlyRate: parsed.hourlyRate,
        salaryPeriod: parsed.salaryPeriod,
        active: parsed.active ?? true,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
  return NextResponse.json(
    {
      error: "Validation failed",
      details: error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    },
    { status: 400 }
  );
}
    console.error("PUT /api/admin/staff", error);
    return NextResponse.json({ error: "Failed to update staff" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id"));

  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const restaurantId = session.user.restaurantId;
  if (!restaurantId) {
    return NextResponse.json({ error: "No restaurant assigned" }, { status: 403 });
  }

  try {
    const staff = await prisma.staff.findUnique({ where: { id } });
    if (!staff || staff.restaurantId !== restaurantId) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    await prisma.staff.delete({ where: { id } });
    return NextResponse.json({ message: "Staff deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/admin/staff", error);
    return NextResponse.json({ error: "Failed to delete staff" }, { status: 500 });
  }
}