//api/auth/guest/route.ts

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcryptjs from "bcryptjs";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json();

    const existing = await prisma.customer.findUnique({ where: { email } });
    if (existing)
      return NextResponse.json(
        { error: "Email already registered." },
        { status: 400 }
      );

    const hashed = await bcryptjs.hash(password, 10);
    const user = await prisma.customer.create({
      data: { email, password: hashed, name },
    });

    return NextResponse.json(user);
  } catch (e) {
    return NextResponse.json(
      { error: "Registration failed." },
      { status: 500 }
    );
  }
}
