// components/Admin/ProtectedRoute.tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { RouteLoader } from "../RouteLoader";

type Role = "ADMIN" | "WAITER" | "KITCHEN" | "CUSTOMER"; // Define allowed roles

export default function ProtectedRoute({
  children,
  requiredRoles = ["ADMIN"],
}: {
  children: React.ReactNode;
  requiredRoles?: Role | Role[];
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/Auth");
      return;
    }

    const rolesArray = Array.isArray(requiredRoles)
      ? requiredRoles
      : [requiredRoles];

    // ✅ Assert that session.user.role is of type `Role`
    const userRole = session.user.role as Role;

    if (!rolesArray.includes(userRole)) {
      router.push("/");
    }
  }, [session, status, requiredRoles, router]);

  if (status === "loading") return <RouteLoader />;
  if (!session) return null;

  return <>{children}</>;
}
