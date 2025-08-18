// src/app/api/auth/[...nextauth]/route.ts
import { authOptions } from "@/lib/authOptions";
import NextAuth from "next-auth";

// ✅ Only export what Next.js expects
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
