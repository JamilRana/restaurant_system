import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcryptjs from "bcryptjs";
import z from "zod";

const prisma = new PrismaClient();

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone is required"),
  address: z.string().min(1, "Address is required"),
  postcode: z.string().min(1, "Postcode is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("Registration request body:", body); // 🔍 Debug

    const data = registerSchema.parse(body);

    const { name, email, phone, address, postcode, password } = data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    const hashedPassword = await bcryptjs.hash(password, 10);

    // Find or create Customer
    const customer = await prisma.customer.upsert({
      where: { email },
      update: {
        name,
        phone,
        address,
        postcode,
      },
      create: {
        name,
        phone,
        email,
        address,
        postcode,
      },
    });

    // Create User and connect to Customer
    const user = await prisma.user.create({
       data:{
        email,
        password: hashedPassword,
        role: "CUSTOMER",
        customer: {
          connect: { id: customer.id },
        },
      },
    });

    // Update customer with userId (optional)
    await prisma.customer.update({
      where: { id: customer.id },
       data:{userId: user.id }
    });

    // Merge guest orders
    await prisma.order.updateMany({
      where: { guestEmail: email },
       data:{
        customerId: customer.id,
        isGuestOrder: false,
        guestName: null,
        guestEmail: null,
      },
    });

    return NextResponse.json(
      { success: true, message: "Account created and guest orders merged!" },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Zod validation error:", error.issues); // 🔥 Critical!
      return NextResponse.json(
        { 
          error: "Validation failed", 
          details: error.issues 
        },
        { status: 400 }
      );
    }

    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Something went wrong during registration" },
      { status: 500 }
    );
  }
}