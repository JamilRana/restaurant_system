// app/api/admin/users/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { PrismaClient, Prisma } from "@prisma/client";
import { z } from "zod";

// Input validation
const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "STAFF", "CUSTOMER", "OWNER"]), // ✅ Add OWNER
  name: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  postcode: z.string().optional(),
  staffId: z.number().int().optional(), // For linking to staff
});

const UpdateUserSchema = CreateUserSchema.partial().extend({
  id: z.number().int(),
  active: z.boolean().optional(),
});

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;

    // Base where clause
    const where: any = {
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        {
          customer: {
            name: { contains: search, mode: "insensitive" },
          },
        },
      ];
    }

    // Count total matching users
    const totalCount = await prisma.user.count({ where });

    // Fetch users with pagination
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        customer: {
          select: {
            name: true,
            phone: true,
            address: true,
            postcode: true,
          },
        },
        staff: {
          select: {
            name: true,
            role: true,
            active: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
    });

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      users,
      totalCount,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error("GET /api/admin/users", error);
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

    const json = await req.json();
    const body = CreateUserSchema.parse(json);
    console.log("Creating user with data:", body);
    console.log("json user:", json);

    const { email, password, role, name, phone, address, postcode, staffId } =
      body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user in transaction
    const createdUser = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const user = await tx.user.create({
          data: {
            email,
            password: hashedPassword,
            role,
          },
        });

        // Create related record based on role
        if (role === "CUSTOMER") {
          await tx.customer.create({
            data: {
              name: name || null,
              phone: phone || null,
              email: email,
              address: address || null,
              postcode: postcode || null,
              userId: user.id,
            },
          });
        } else if (role === "STAFF" && staffId) {
          // Link to existing staff member
          await tx.staff.update({
            where: { id: staffId },
            data: {
              userId: user.id,
              active: true, // Activate staff when user is created
            },
          });
        }

        return user;
      }
    );

    return NextResponse.json(
      {
        id: createdUser.id,
        email: createdUser.email,
        role: createdUser.role,
        message: "User created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation failed", errors: error.issues },
        { status: 400 }
      );
    }
    console.error("POST /api/admin/users", error);
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

    const json = await req.json();
    const body = UpdateUserSchema.parse(json);

    const {
      id,
      email,
      password,
      role,
      name,
      phone,
      address,
      postcode,
      active,
    } = body;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        customer: true,
        staff: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const data: any = { role };

    if (email) data.email = email;
    if (password) {
      const bcrypt = require("bcryptjs");
      data.password = await bcrypt.hash(password, 12);
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.user.update({
        where: { id },
        data,
      });

      // Update related records
      if (user.role === "CUSTOMER" && user.customer) {
        await tx.customer.update({
          where: { userId: id },
          data: {
            name: name ?? undefined,
            phone: phone ?? undefined,
            address: address ?? undefined,
            postcode: postcode ?? undefined,
            email: email,
          },
        });
      } else if (user.role === "STAFF" && user.staff) {
        await tx.staff.update({
          where: { userId: id },
          data: {
            name: name ?? undefined,
            email: email,
            active: active !== undefined ? active : user.staff.active,
          },
        });
      }
    });

    return NextResponse.json({ message: "User updated successfully" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation failed", errors: error.issues },
        { status: 400 }
      );
    }
    console.error("PUT /api/admin/users", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// PATCH for active/inactive toggle
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

    const userId = parseInt(id);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { staff: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent self-deactivation
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: "You cannot deactivate your own account" },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Update user status
      await tx.user.update({
        where: { id: userId },
        data: { active: Boolean(active) },
      });

      // If staff user, update staff active status
      if (user.staff) {
        await tx.staff.update({
          where: { userId: userId },
          data: { active: Boolean(active) },
        });
      }
    });

    return NextResponse.json({
      message: `User ${active ? "activated" : "deactivated"} successfully`,
    });
  } catch (error) {
    console.error("PATCH /api/admin/users", error);
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

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id || isNaN(Number(id))) {
      return NextResponse.json(
        { error: "Invalid or missing id" },
        { status: 400 }
      );
    }

    const userId = parseInt(id);

    // Prevent self-delete
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Handle related records
      if (user.role === "CUSTOMER") {
        await tx.customer.deleteMany({
          where: { userId },
        });
      } else if (user.role === "STAFF") {
        // Remove user link from staff but keep staff record
        await tx.staff.updateMany({
          where: { userId },
          data: { userId: null, active: false },
        });
      }

      await tx.user.delete({
        where: { id: userId },
      });
    });

    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/admin/users", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
