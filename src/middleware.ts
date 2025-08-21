// middleware.ts
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const pathname = request.nextUrl.pathname;

  // 🚫 Skip middleware for public API routes
  if (
    pathname.startsWith("/api/menu") ||
    pathname.startsWith("/api/restaurant/info")
  ) {
    return NextResponse.next(); // Allow public access
  }

  // Protect admin routes
  if (pathname.startsWith("/admin")) {
    if (!token) {
      return NextResponse.redirect(new URL("/Auth", request.url));
    }
    if (token.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // You can add more protected routes here
  return NextResponse.next();
}

// export const config = {
//   matcher: ["/admin/:path*", "/api/:path*"],
// };

export const config = {
  matcher: [
    /*
     * Match all requests except:
     * - /api/menu
     * - /api/restaurant/info
     * - public files (/_next, /favicon.ico, etc.)
     */
    "/((?!api/menu|api/restaurant/info|_next|[^?]*\\.(?:html?|css|json|svg|png|jpg|webp|ico)$).*)",
  ],
};
