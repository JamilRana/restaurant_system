// app/Auth/redirect/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.redirect("/login");
  }

  let baseUrl = process.env.NEXTAUTH_URL;

  // Fallback to Vercel or localhost
  if (!baseUrl) {
    if (process.env.VERCEL) {
      baseUrl = `https://${process.env.VERCEL_URL}`;
    } else {
      baseUrl = "http://localhost:3000";
    }
  }

  // Ensure protocol
  if (!baseUrl.startsWith("http")) {
    baseUrl = `http://${baseUrl}`;
  }

  const pathname = session.user.role === "ADMIN" ? "/admin/category" : "/menu";

  const redirectUrl = new URL(pathname, baseUrl);

  return NextResponse.redirect(redirectUrl);
}
