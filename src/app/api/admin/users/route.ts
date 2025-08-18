// app/api/admin/users/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { PrismaClient, Prisma } from "@prisma/client";
import { z } from "zod";

// Input validation
// In admin API or anywhere
const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["CUSTOMER", "KITCHEN", "ADMIN"]), // ✅ Literal union
  name: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  postcode: z.string().optional(),
});

const UpdateUserSchema = CreateUserSchema.partial().extend({
  id: z.number().int(),
});

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
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
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(users);
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

    const { email, password, role, name, phone, address, postcode } = body;

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

    // Hash password (use bcryptjs or bcrypt)
    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user and customer in transaction
    const createdUser = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const user = await tx.user.create({
          data: {
            email,
            password: hashedPassword,
            role,
          },
        });

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

        return user; // Return user from transaction
      }
    );

    return NextResponse.json({
      id: createdUser.id,
      email: createdUser.email,
      role: createdUser.role,
      message: "User created successfully",
    });
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

    const { id, email, password, role, name, phone, address, postcode } = body;

    const user = await prisma.user.findUnique({
      where: { id },
      include: { customer: true },
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

      await tx.customer.upsert({
        where: { userId: id },
        create: {
          name: name || "",
          phone: phone || "",
          email: email || "",
          address: address || "",
          postcode: postcode || "",
          userId: id,
        },
        update: {
          name: name ?? undefined,
          phone: phone ?? undefined,
          address: address ?? undefined,
          postcode: postcode ?? undefined,
          email: email,
        },
      });
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
      await tx.customer.deleteMany({
        where: { userId },
      });
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
