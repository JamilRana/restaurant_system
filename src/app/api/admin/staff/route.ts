// app/api/admin/staff/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/authOptions";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const StaffSchema = z.object({
  id: z.number().int().optional(),
  name: z.string().min(1, "Name is required"),
  role: z.enum([
    "CHEF",
    "WAITER",
    "MANAGER",
    "CASHIER",
    "DELIVERY",
    "CLEANER",
    "OTHER",
  ]),
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
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD")
    .refine((date) => !isNaN(new Date(date).getTime()), "Invalid date"),
  salary: z.number().optional().nullable(),
  hourlyRate: z.number().optional().nullable(),
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
    return NextResponse.json(
      { error: "No restaurant assigned" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 10;
  const offset = (page - 1) * limit;

  try {
    const where: any = {
      restaurantId,
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
          userId: true, // Include userId to check user account
        },
        orderBy: { name: "asc" },
        skip: offset,
        take: limit,
      }),
      prisma.staff.count({ where }),
    ]);
    console.log("Fetched staff salary type:", typeof staff[0]?.salary);

    return NextResponse.json({
      staff,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error("GET /api/admin/staff", error);
    return NextResponse.json(
      { error: "Failed to load staff" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const restaurantId = session.user.restaurantId;
  if (!restaurantId) {
    return NextResponse.json(
      { error: "No restaurant assigned" },
      { status: 403 }
    );
  }

  try {
    const data = await request.json();
    const parsed = StaffSchema.parse(data);

    if (parsed.email) {
      const existing = await prisma.staff.findFirst({
        where: { email: parsed.email, restaurantId },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Email already in use" },
          { status: 409 }
        );
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
        ...(parsed.salaryPeriod !== null && {
          salaryPeriod: parsed.salaryPeriod,
        }),
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
    return NextResponse.json(
      { error: "Failed to create staff" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const restaurantId = session.user.restaurantId;
  if (!restaurantId) {
    return NextResponse.json(
      { error: "No restaurant assigned" },
      { status: 403 }
    );
  }

  try {
    const data = await request.json();
    const parsed = StaffSchema.parse(data);

    console.log("Received data:", data);
    console.log("Parsed:", parsed);

    if (!parsed.id) {
      return NextResponse.json(
        { error: "Staff ID is required" },
        { status: 400 }
      );
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
        return NextResponse.json(
          { error: "Email already in use" },
          { status: 409 }
        );
      }
    }

    // Update staff and potentially user status
    const updated = await prisma.staff.update({
      where: { id: parsed.id },
      data: {
        name: parsed.name,
        role: parsed.role,
        email: parsed.email,
        phone: parsed.phone,
        hireDate: parsed.hireDate ? new Date(parsed.hireDate) : staff.hireDate,
        salary: parsed.salary,
        hourlyRate: parsed.hourlyRate,
        ...(parsed.salaryPeriod !== null && {
          salaryPeriod: parsed.salaryPeriod,
        }),
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
    return NextResponse.json(
      { error: "Failed to update staff" },
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

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const { active } = await req.json();

    if (!id || isNaN(Number(id))) {
      return NextResponse.json(
        { error: "Invalid or missing id" },
        { status: 400 }
      );
    }

    const staffId = parseInt(id);

    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      include: { user: true },
    });

    if (!staff) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    // Prevent self-deactivation
    if (staff.userId === session.user.id) {
      return NextResponse.json(
        { error: "You cannot deactivate your own account" },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // Update staff status
      await tx.staff.update({
        where: { id: staffId },
        data: {
          active: Boolean(active),
        },
      });

      // Only update user status if staff has a user account
      if (staff.userId) {
        await tx.user.update({
          where: { id: staff.userId },
          data: { active: Boolean(active) },
        });
      }
    });

    return NextResponse.json({
      message: `Staff ${active ? "activated" : "deactivated"} successfully`,
    });
  } catch (error) {
    console.error("PATCH /api/admin/staff", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
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
    return NextResponse.json(
      { error: "No restaurant assigned" },
      { status: 403 }
    );
  }

  try {
    const staff = await prisma.staff.findUnique({ where: { id } });
    if (!staff || staff.restaurantId !== restaurantId) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    // Check if staff has a user account
    if (staff.userId) {
      return NextResponse.json(
        {
          error:
            "Cannot delete staff with user account. Please delete the user first.",
        },
        { status: 400 }
      );
    }

    await prisma.staff.delete({ where: { id } });
    return NextResponse.json({ message: "Staff deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/admin/staff", error);
    return NextResponse.json(
      { error: "Failed to delete staff" },
      { status: 500 }
    );
  }
}
