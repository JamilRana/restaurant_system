// app/order-status/page.tsx
export const dynamic = "force-dynamic";

import { Suspense } from "react";
import OrderStatusClient from "./OrderStatusClient";

export default function OrderStatusPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
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
