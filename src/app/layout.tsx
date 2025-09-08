// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Topbar from "@/components/Topbar";
import AuthSessionProvider from "./providers/SessionProviders";
import QueryClientProviderWrapper from "@/QueryClientProvider";
import { LoadingProvider } from "@/context/LoadingContext";
import { RouteLoader } from "@/components/RouteLoader";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Food Ordering Application",
  description: "",
};

// layout.tsx
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen flex flex-col`}>
        <AuthSessionProvider>
          {" "}
          {/* Now includes auth loader */}
          <Navbar />
          <Topbar />
          <QueryClientProviderWrapper>
            <main className="flex-grow pb-10">
              {children}
              <Toaster position="top-right" reverseOrder={false} />
            </main>
          </QueryClientProviderWrapper>
          <Footer />
        </AuthSessionProvider>
      </body>
    </html>
  );
}
