// app/order-status/page.tsx
export const dynamic = "force-dynamic";

import { Suspense } from "react";
import OrderStatusClient from "./OrderStatusClient"; // ✅ Normal import

export default function OrderStatusPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-6">
          <img
            src="/images/logo.png"
            alt="Logo"
            className="w-16 h-16 mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-gray-800">Bella Italia</h1>
        </div>

        {/* ✅ Suspense with fallback */}
        <Suspense
          fallback={
            <div className="py-8">
              <div className="inline-block">
                <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <h2 className="mt-4 text-lg text-gray-700">
                Processing your order...
              </h2>
            </div>
          }
        >
          <OrderStatusClient />
        </Suspense>
      </div>
    </div>
  );
}
