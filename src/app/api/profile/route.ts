// app/api/customer/profile/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/authOptions";
import bcrypt from "bcryptjs";

type ProfileUpdateBody = {
  action: "profile" | "password";
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  postcode?: string;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "CUSTOMER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        customer: true,
      },
    });

    if (!user || !user.customer) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      name: user.customer.name,
      phone: user.customer.phone,
      email: user.email,
      address: user.customer.address,
      postcode: user.customer.postcode,
    });
  } catch (error: any) {
    console.error("Failed to fetch profile:", error);
    return NextResponse.json(
      { error: "Failed to load profile" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "CUSTOMER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const userEmail = session.user.email;

  try {
    const body: ProfileUpdateBody = await request.json();
    const { action } = body;

    if (action === "profile") {
      const updates: any = {};
      const customerUpdates: any = {};
      const reservationUpdates: any = {};

      if (body.name !== undefined) {
        customerUpdates.name = body.name.trim();
        reservationUpdates.name = body.name.trim();
      }
      if (body.phone !== undefined) {
        reservationUpdates.phone = body.phone.trim();
      }
      if (body.email !== undefined) {
        const newEmail = body.email.trim();

        updates.email = newEmail;
        customerUpdates.email = newEmail;
        reservationUpdates.email = newEmail;
      }
      if (body.address !== undefined) {
        customerUpdates.address = body.address.trim();
      }
      if (body.postcode !== undefined) {
        customerUpdates.postcode = body.postcode.trim();
      }

      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: updates,
        }),
        prisma.customer.update({
          where: { userId: userId },
          data: customerUpdates,
        }),
        prisma.reservation.updateMany({
          where: { email: userEmail },
          data: reservationUpdates,
        }),
      ]);

      return NextResponse.json({
        success: true,
        message: "Profile updated successfully",
      });
    }

    if (action === "password") {
      const { currentPassword, newPassword, confirmPassword } = body;

      if (!currentPassword || !newPassword || !confirmPassword) {
        return NextResponse.json(
          {
            error:
              "Current password, new password, and confirmation are required",
          },
          { status: 400 }
        );
      }

      if (newPassword !== confirmPassword) {
        return NextResponse.json(
          { error: "New passwords do not match" },
          { status: 400 }
        );
      }

      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: "New password must be at least 6 characters long" },
          { status: 400 }
        );
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const isPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password
      );
      if (!isPasswordValid) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 400 }
        );
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);

      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });

      return NextResponse.json({
        success: true,
        message: "Password updated successfully",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Failed to update", details: error.message },
      { status: 500 }
    );
  }
}
