import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // ✅ fix path
import bcryptjs from "bcryptjs";
import z from "zod";

const registerSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    phone: z.string().min(1, "Phone is required"),
    address: z.string().min(1, "Address is required"),
    postcode: z.string().min(1, "Postcode is required"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("Registration request body:", body);

    const data = registerSchema.parse(body);

    const { name, email, phone, address, postcode, password } = data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcryptjs.hash(password, 10);

    // ✅ Wrap in transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Find or create Customer
      const customer = await tx.customer.upsert({
        where: { email },
        update: {
          name,
          phone,
          address,
          postcode,
          // Optional: if merging guest orders, keep existing totalSpent/orderCount
        },
        create: {
          name,
          phone,
          email,
          address,
          postcode,
          totalSpent: 0,
          orderCount: 0,
          isGuest: true, // will be set to false below
        },
      });

      // 2. Create User linked to Customer
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          role: "CUSTOMER",
          customer: {
            connect: { id: customer.id },
          },
        },
      });

      // 3. Update Customer to link back to User and mark as non-guest
      await tx.customer.update({
        where: { id: customer.id },
        data: {
          userId: user.id,
          isGuest: false,
        },
      });

      return { user, customer };
    });

    return NextResponse.json(
      { success: true, message: "Account created successfully!" },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.issues);
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Registration failed:", error);
    return NextResponse.json(
      { error: "Failed to create account. Please try again." },
      { status: 500 }
    );
  }
}
