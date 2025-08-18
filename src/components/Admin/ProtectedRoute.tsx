// components/Admin/ProtectedRoute.tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProtectedRoute({
  children,
  requiredRole = "ADMIN",
}: {
  children: React.ReactNode;
  requiredRole?: string;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/Auth"); // or "/login"
    } else if (session.user.role !== requiredRole) {
      router.push("/unauthorized");
    }
  }, [session, status, requiredRole, router]);

  if (status === "loading") return <p className="text-center">Loading...</p>;

  return <>{children}</>;
}