// app/order-status/OrderStatusClient.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useBasketStore } from "../store/basketStore";
import Loader from "@/components/Loader";
import { RouteLoader } from "@/components/RouteLoader";

export default function OrderStatusClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const sessionId = searchParams.get("session_id");
  const paymentMethod = searchParams.get("paymentMethod");
  const orderIdFromCash = searchParams.get("orderId");
  const setGuestInfo = useBasketStore();
  const clearBasket = useBasketStore((state) => state.clearBasket);
  const [loading, setLoading] = useState(true);
  if (loading) {
    return <RouteLoader />;
  }

  useEffect(() => {
    if (paymentMethod === "cash" && orderIdFromCash) {
      clearBasket();
      // Go directly to order details
      router.push(`/orders?orderId=${orderIdFromCash}`);
      return;
    }
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
      fetch("/api/orders/confirm-order-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            if (setGuestInfo) {
              clearBasket();
              alert("Order Confirmation Email send to you.");
              router.push(`/`);
            }
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
    setLoading(false);
  }, [success, sessionId, clearBasket, router]);

  return null;
}
