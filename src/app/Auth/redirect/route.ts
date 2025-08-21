// app/Auth/redirect/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.redirect("/Auth");
  }

  let baseUrl = process.env.NEXTAUTH_URL;

  // Fallback to Vercel or localhost
  if (!baseUrl) {
    if (process.env.VERCEL) {
      baseUrl = "https://restaurant-system-z1yh.vercel.app";
    } else {
      baseUrl = "https://restaurant-system-z1yh.vercel.app";
    }
  }

  if (baseUrl.startsWith("http://") && process.env.VERCEL) {
    console.warn("Replacing http with https for Vercel deployment");
    baseUrl = baseUrl.replace("http://", "https://");
  }

  const pathname = session.user.role === "ADMIN" ? "/admin/orders" : "/";

  const redirectUrl = new URL(pathname, baseUrl);

  return NextResponse.redirect(redirectUrl);
}
