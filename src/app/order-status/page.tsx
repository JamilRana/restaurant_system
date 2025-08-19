"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useBasketStore } from "../store/basketStore";

export default function OrderStatusPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const sessionId = searchParams.get("session_id");
  const clearBasket = useBasketStore((state) => state.clearBasket);

  useEffect(() => {
    if (success === "false") {
      alert("Payment was canceled. You can try again.");
      router.push("/checkout");
      return;
    }
    if (success === null) {
      alert("Payment was canceled. You can try again.");
      router.push("/");
      return;
    }
    if (success === "true" && sessionId) {
      // ✅ Confirm order with backend
      fetch("/api/orders/confirm-order-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            clearBasket();
            router.push(`/orders?orderId=${data.orderId}`);
          } else {
            console.error("Failed to save order:", data.error);
            alert(
              "Payment succeeded, but order could not be saved. Contact support."
            );
          }
        })
        .catch((err) => {
          console.error("Error confirming order:", err);
          alert(
            "An error occurred. Please contact support with your session ID."
          );
        });
    }
  }, [success, sessionId, clearBasket, router]);

  return (
    <div className="p-6 text-center">
      <h1 className="text-2xl font-bold mb-4">Order Status</h1>
      <p>Processing your order...</p>
    </div>
  );
}
