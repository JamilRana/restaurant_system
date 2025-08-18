// app/Auth/redirect/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  console.log("Session:", session); // Should show full user

  if (!session) {
    console.log(" No session, redirecting to /Auth");
    return NextResponse.redirect(new URL("/Auth", process.env.NEXTAUTH_URL!));
  }

  console.log("✅ User role:", session.user.role);

  const role = session.user.role;

  let url = "/";
  if (role === "ADMIN") {
    url = "/admin/category";
  } else if (role === "KITCHEN") {
    url = "/kitchen";
  } else {
    url = "/"; // customer
  }

  return NextResponse.redirect(new URL(url, process.env.NEXTAUTH_URL!));
}
