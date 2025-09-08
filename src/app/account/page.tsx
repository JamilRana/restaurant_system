// app/account/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { RouteLoader } from "@/components/RouteLoader";
import OrdersTab from "./tabs/OrdersTab";
import ReservationsTab from "./tabs/ReservationsTab";
import ProfileTab from "./tabs/ProfileTab";

export default function AccountPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read tab from URL hash or default to "orders"
  const getTabFromHash = () => {
    if (typeof window === "undefined") return "orders";
    const hash = window.location.hash.replace("#", "");
    return hash === "profile"
      ? "profile"
      : hash === "reservations"
      ? "reservations"
      : "orders";
  };

  const [activeTab, setActiveTab] = useState<
    "orders" | "reservations" | "profile"
  >("orders");

  // Set initial tab from hash
  useEffect(() => {
    setActiveTab(getTabFromHash());
  }, []);

  // Listen to hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "") || "orders";
      const validTabs = ["orders", "reservations", "profile"];
      const newTab = validTabs.includes(hash) ? (hash as any) : "orders";
      setActiveTab(newTab);
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Update hash when tab changes
  const handleTabChange = (tab: "orders" | "reservations" | "profile") => {
    window.location.hash = tab;
    // Optional: update URL without reload
    // router.replace(`${pathname}?${searchParams.toString()}#${tab}`, { scroll: false });
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth");
    }
  }, [status, router]);

  if (status === "loading") {
    return <RouteLoader />;
  }

  if (status === "unauthenticated") return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">My Account</h1>
          <p className="text-gray-600">
            Welcome back,{" "}
            <span className="font-semibold">
              {session?.user.name || session?.user.email?.split("@")[0]}
            </span>
          </p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-1 mb-8 bg-white/40 backdrop-blur-sm p-1 rounded-xl shadow-sm border border-white/60">
          {[
            { key: "orders", label: "Orders" },
            { key: "reservations", label: "Reservations" },
            { key: "profile", label: "Profile" },
          ].map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => handleTabChange(key as any)}
              className={`px-6 py-3 rounded-lg font-medium transition text-sm sm:text-base
                ${
                  activeTab === key
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-800"
                }
              `}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-6 min-h-96">
          {activeTab === "orders" && <OrdersTab />}
          {activeTab === "reservations" && <ReservationsTab />}
          {activeTab === "profile" && <ProfileTab />}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          Need help?{" "}
          <a
            href="mailto:support@yourapp.com"
            className="text-blue-500 hover:underline"
          >
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}
