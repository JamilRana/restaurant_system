import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Topbar from "@/components/Topbar";
import AuthSessionProvider from "./providers/SessionProviders";
import QueryClientProviderWrapper from "@/QueryClientProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Food Ordering Application",
  description: "",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen flex flex-col`}>
        <AuthSessionProvider>
          <Navbar />
          <Topbar />
          <QueryClientProviderWrapper>
            <main className="flex-grow pb-10">{children}</main>
          </QueryClientProviderWrapper>
          <Footer />
        </AuthSessionProvider>
      </body>
    </html>
  );
}
