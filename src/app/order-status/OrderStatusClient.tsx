// app/order-status/OrderStatusClient.tsx
"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useBasketStore } from "../store/basketStore";

export default function OrderStatusClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const sessionId = searchParams.get("session_id");
  const paymentMethod = searchParams.get("paymentMethod");
  const orderIdFromCash = searchParams.get("orderId");
  const clearBasket = useBasketStore((state) => state.clearBasket);

  // ✅ Move all useEffects to the top level (no early returns before them)
  useEffect(() => {
    // Case 1: User came from Stripe and payment failed
    if (success === "false") {
      alert("Payment was canceled. You can try again.");
      router.push("/checkout");
      return;
    }

    // Case 2: Stripe succeeded → verify session
    if (success === "true" && sessionId) {
      fetch("/api/orders/confirm", {
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
            alert(
              "Payment succeeded, but order could not be saved. Contact support."
            );
          }
        })
        .catch(() => {
          alert("An error occurred. Please contact support.");
        });
      return;
    }

    // Case 3: Cash payment — redirect immediately
    if (paymentMethod === "cash" && orderIdFromCash) {
      clearBasket();
      router.push(`/orders?orderId=${orderIdFromCash}`);
      return;
    }

    // Case 4: Invalid state
    if (success !== "true" && success !== "false" && !paymentMethod) {
      alert("Invalid order status.");
      router.push("/");
    }
  }, [success, sessionId, paymentMethod, orderIdFromCash, clearBasket, router]); // ✅ Add ALL dependencies

  return <p>Processing your order...</p>;
}
