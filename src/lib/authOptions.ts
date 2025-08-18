// app/api/auth/[...nextauth]/route.ts
import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcryptjs from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        console.log("Attempting login for:", credentials?.email);

        if (!credentials?.email || !credentials?.password) {
          console.log("Missing credentials");
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { customer: true, restaurant: true },
        });

        if (!user) {
          console.log("User not found");
          return null;
        }

        if (!user.password) {
          console.log("User has no password set");
          return null;
        }

        const isValid = await bcryptjs.compare(
          credentials.password,
          user.password
        );
        if (!isValid) {
          console.log("Invalid password");
          return null;
        }

        console.log("Login successful for:", user.email);
        return {
          id: user.id,
          email: user.email,
          name: user.customer?.name,
          phone: user.customer?.phone,
          address: user.customer?.address,
          postcode: user.customer?.postcode,
          role: user.role || "CUSTOMER",
          restaurantId: user.restaurant?.id || null,
        };
      },
    }),
  ],
  pages: {
    signIn: "/Auth",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as number;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        token.phone = user.phone;
        token.address = user.address;
        token.postcode = user.postcode;
        token.restaurantId = user.restaurantId;
      }
      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.role = token.role as string;
        session.user.phone = token.phone as string;
        session.user.address = token.address as string;
        session.user.postcode = token.postcode as string;
        session.user.restaurantId = token.restaurantId;
      }
      return session;
    },
  },
};
