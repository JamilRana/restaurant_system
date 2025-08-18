// lib/auth.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

export const getCurrentUser = async () => {
  const session = await getServerSession(authOptions);
  return session?.user;
};

export const requireAuth = async (roles: string[] = []) => {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/Auth");
  }

  if (roles.length > 0 && !roles.includes(user.role)) {
    redirect("/unauthorized");
  }

  return user;
};