// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/app/globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Topbar from "@/components/Topbar";
import QueryClientProviderWrapper from "@/QueryClientProvider";
import { LoadingProvider } from "@/context/LoadingContext";
import { RouteLoader } from "@/components/RouteLoader";
import AuthSessionProvider from "@/app/providers/SessionProviders";
import ProtectedRoute from "@/components/Admin/ProtectedRoute";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ProtectedRoute requiredRoles="ADMIN">
      <main className="flex-grow pb-10">{children}</main>
    </ProtectedRoute>
  );
}
