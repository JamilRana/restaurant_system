// types/next-auth.d.ts
import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: number;
      email?: string | null;
      name?: string | null;
      phone?: string | null;
      role: string;
      address?: string | null;
      postcode?: string | null;
      restaurantId: number | null;
    };
  }

  interface User {
    id: number;
    email?: string | null;
    name?: string | null;
    phone?: string | null;
    role: string;
    address?: string | null;
    postcode?: string | null;
    restaurantId: number | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: number;
    role?: string;
    restaurantId: number | null;
  }
}
