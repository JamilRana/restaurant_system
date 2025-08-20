// app/checkout/page.tsx
import CheckoutPage from "@/components/Cart/Checkout";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6">Loading checkout...</div>}>
      <CheckoutPage />
    </Suspense>
  );
}

// Keep your CheckoutPage component as default export
