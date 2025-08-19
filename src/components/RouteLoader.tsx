// components/RouteLoader.tsx
"use client";

import { usePathname } from "next/navigation";
import { useLoading } from "@/context/LoadingContext";
import { useEffect } from "react";

export function RouteLoader() {
  const pathname = usePathname();
  const { showLoader, hideLoader } = useLoading();

  useEffect(() => {
    showLoader();
    const timeout = setTimeout(() => hideLoader(), 500); // Simulate load
    return () => clearTimeout(timeout);
  }, [pathname]);

  return null;
}
