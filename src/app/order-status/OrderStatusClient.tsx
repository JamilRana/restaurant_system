// app/order-status/OrderStatusClient.tsx
"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useBasketStore } from "../store/basketStore";
import { da } from "zod/v4/locales/index.cjs";

export default function OrderStatusClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const sessionId = searchParams.get("session_id");
  const paymentMethod = searchParams.get("paymentMethod");
  const orderIdFromCash = searchParams.get("orderId");
  const clearBasket = useBasketStore((state) => state.clearBasket);

  // ✅ Prevent double execution
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Skip if already processed
    if (hasProcessed.current) return;
    if (!sessionId && success !== "false" && !paymentMethod) return;

    // Mark as processing
    hasProcessed.current = true;

    // Case 1: Payment failed
    if (success === "false") {
      alert("Payment was canceled. You can try again.");
      router.push("/checkout");
      return;
    }

    // Case 2: Stripe success
    if (success === "true" && sessionId) {
      fetch("/api/orders/confirm-order-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })
        .then((res) => res.json())
        .then((data) => {
          console.log("Customer data received:", data.customer);
          if (data.success) {
            if (data.customer.isGuest) {
              clearBasket();
              router.push(
                `/dashboard?phone=${encodeURIComponent(
                  data.customer.phone
                )}&email=${encodeURIComponent(data.customer.email)}`
              );
            } else {
              clearBasket();
              router.push(`/account`);
            }
          } else {
            alert(
              "Payment succeeded, but order could not be saved. Contact support."
            );
          }
        })
        .catch((err) => {
          console.error("Order confirmation error:", err);
          alert("An error occurred. Please contact support.");
        });
      return;
    }

    // Case 3: Cash
    if (paymentMethod === "cash" && orderIdFromCash) {
      clearBasket();
      router.push(`/orders?orderId=${orderIdFromCash}`);
      return;
    }

    // Case 4: Invalid
    alert("Invalid order status.");
    router.push("/");
  }, [success, sessionId, paymentMethod, orderIdFromCash, clearBasket, router]);

  return <p>Processing your order...</p>;
}
