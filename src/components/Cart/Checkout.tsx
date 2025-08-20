// app/checkout/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import OrderDetailsWrapper from "@/components/Order/OrderDetailsWrapper";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTimeSlots } from "@/lib/useTimeSlots";
import { RouteLoader } from "@/components/RouteLoader";
import { useBasketStore } from "@/app/store/basketStore";

const CheckoutPage = () => {
  const { data: session, status } = useSession();
  const {
    basketItems,
    deliveryMode,
    postcode,
    address,
    orderNote,
    promoCode,
    discountAmount,
    appliedPromo,
    guestName,
    guestEmail,
    setGuestInfo,
    setDeliveryMode,
    setPromoCode,
    setDiscount,
    clearPromo,
  } = useBasketStore();

  const [timeSlot, setTimeSlot] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [errors, setErrors] = useState({
    timeSlot: "",
    paymentMethod: "",
    address: "",
  });

  const router = useRouter();

  // ✅ Get time slots from hook
  const availableTimeSlots = useTimeSlots();

  // Auto-set to collection if guest
  useEffect(() => {
    if (status === "loading") return;

    if (!session && deliveryMode !== "collection") {
      setDeliveryMode("collection");
    }

    if (!session && !guestName && !guestEmail) {
      router.push("/Auth");
    }
  }, [
    session,
    status,
    deliveryMode,
    setDeliveryMode,
    guestName,
    guestEmail,
    router,
  ]);

  // Fetch delivery fee
  useEffect(() => {
    if (!postcode || deliveryMode === "collection") {
      setDeliveryFee(0);
      return;
    }
    const fetchDeliveryFee = async () => {
      try {
        const res = await fetch(
          `/api/delivery-fee?postcode=${encodeURIComponent(postcode)}`
        );
        const data = await res.json();
        setDeliveryFee(
          res.ok && typeof data.deliveryFee === "number" ? data.deliveryFee : 0
        );
      } catch (err) {
        console.error("Failed to fetch delivery fee", err);
        setDeliveryFee(0);
      }
    };
    fetchDeliveryFee();
  }, [postcode, deliveryMode]);

  // Recalculate total
  useEffect(() => {
    const itemTotal = basketItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const delivery = deliveryMode === "delivery" ? deliveryFee : 0;
    setTotalAmount(Math.max(itemTotal + delivery - discountAmount, 0));
  }, [basketItems, deliveryFee, deliveryMode, discountAmount]);

  // Set default time slot
  useEffect(() => {
    if (availableTimeSlots.length > 0 && !timeSlot) {
      setTimeSlot(availableTimeSlots[0]);
    }
  }, [availableTimeSlots, timeSlot]);

  // Apply promo
  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setIsApplying(true);
    setPromoError("");

    try {
      const itemTotal = basketItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      const delivery = deliveryMode === "delivery" ? deliveryFee : 0;
      const preDiscountTotal = itemTotal + delivery;

      const res = await fetch("/api/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: promoCode,
          restaurantId: 1, // Replace with dynamic ID
          totalAmount: preDiscountTotal,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Invalid promo code");
      }

      const data = await res.json();
      setDiscount(data.discountAmount);
    } catch (error: any) {
      setPromoError(error.message);
      clearPromo();
    } finally {
      setIsApplying(false);
    }
  };

  // Handle checkout
  const handleCheckout = async () => {
    if (isProcessing) return;
    setErrors({ timeSlot: "", paymentMethod: "", address: "" });

    let hasError = false;

    if (!timeSlot) {
      setErrors((prev) => ({ ...prev, timeSlot: "Please select a time slot" }));
      hasError = true;
    }

    if (!paymentMethod) {
      setErrors((prev) => ({
        ...prev,
        paymentMethod: "Please select a payment method",
      }));
      hasError = true;
    }

    if (deliveryMode === "delivery") {
      if (!postcode || !address) {
        setErrors((prev) => ({
          ...prev,
          address: "Please enter delivery address",
        }));
        hasError = true;
      }
      if (!session) {
        setErrors((prev) => ({
          ...prev,
          address: "Login required for delivery",
        }));
        hasError = true;
      }
    }

    if (hasError) return;

    setIsProcessing(true);

    if (paymentMethod === "cash") {
      try {
        const res = await fetch("/api/orders/confirm-cash", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            totalAmount,
            deliveryType: deliveryMode === "delivery" ? "DELIVERY" : "PICKUP",
            paymentStatus: "pending",
            paymentMethod: "cash",
            status: "placed",
            timeSlot,
            address: deliveryMode === "delivery" ? address : null,
            postcode: deliveryMode === "delivery" ? postcode : null,
            orderNote,
            promoCode: appliedPromo?.code || null,
            customerId: session?.user?.id || null,
            deliveryFee,
            discountAmount,
            items: basketItems.map((item) => ({
              foodId: item.id,
              quantity: item.quantity,
              price: item.price,
              foodOptionId: item.optionId || null,
            })),
            isGuestOrder: !session,
            guestName: !session ? guestName : null,
            guestEmail: !session ? guestEmail : null,
          }),
        });

        if (!res.ok) throw new Error("Failed to place order");
        if (!session) {
          useBasketStore.getState().clearBasket();
          alert("Order Confirmation Email send to you.");
          router.push("/");
        } else {
          useBasketStore.getState().clearBasket();
          alert("Thank you for your order.");
          router.push("/orders");
        }
      } catch (error) {
        alert("Failed to place order");
      } finally {
        setIsProcessing(false);
      }
    }

    if (paymentMethod === "card") {
      try {
        const response = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: basketItems,
            deliveryFee,
            timeSlot,
            address,
            postcode,
            deliveryType: deliveryMode === "delivery" ? "DELIVERY" : "PICKUP",
            orderNote,
            promoCode: appliedPromo?.code || null,
            isGuestOrder: !session,
            guestName: !session ? guestName : null,
            guestEmail: !session ? guestEmail : null,
          }),
        });

        if (!response.ok) throw new Error("Failed to create payment session");

        const { url } = await response.json();
        if (url) router.push(url);
      } catch (error) {
        alert("Payment could not be initiated.");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  if (status === "loading") {
    return <RouteLoader />;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>

      {/* User Info */}
      <div className="mb-6">
        {session ? (
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold">
              Welcome Back, {session.user?.name}!
            </h2>
            <span className="text-gray-700">{session.user?.email}</span>
          </div>
        ) : (
          <div className="mb-2 p-2 border rounded bg-yellow-50">
            <h3 className="font-semibold">Guest : {guestEmail}</h3>
          </div>
        )}
      </div>

      {/* Checkout Body */}
      <div className="flex flex-col md:flex-row gap-2">
        <div className="flex-1 space-y-6">
          {/* Time Slot */}
          <div>
            <label className="block mb-2 font-medium text-sm">
              Choose your time slot
            </label>
            <select
              value={timeSlot}
              onChange={(e) => {
                setTimeSlot(e.target.value);
                setErrors((prev) => ({ ...prev, timeSlot: "" }));
              }}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="">Select time</option>
              {availableTimeSlots.length === 0 ? (
                <option disabled>No available slots</option>
              ) : (
                availableTimeSlots.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))
              )}
            </select>
            {errors.timeSlot && (
              <p className="text-red-500 text-sm">{errors.timeSlot}</p>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <label className="block mb-2 font-medium text-sm">
              Payment Information
            </label>
            <div className="space-y-2 text-sm">
              {session && (
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="payment"
                    value="cash"
                    checked={paymentMethod === "cash"}
                    onChange={(e) => {
                      setPaymentMethod(e.target.value);
                      setErrors((prev) => ({ ...prev, paymentMethod: "" }));
                    }}
                  />
                  Cash (Pay when order is received)
                </label>
              )}
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="payment"
                  value="card"
                  checked={paymentMethod === "card"}
                  onChange={(e) => {
                    setPaymentMethod(e.target.value);
                    setErrors((prev) => ({ ...prev, paymentMethod: "" }));
                  }}
                />
                Credit or Debit Card
              </label>
            </div>
            {errors.paymentMethod && (
              <p className="text-red-500 text-sm">{errors.paymentMethod}</p>
            )}
          </div>
          {deliveryMode === "delivery" && address && postcode && (
            <div className="mt-4">
              <h3 className="font-semibold text-lg">Delivery Address</h3>
              <p>{address}</p>
              <p>Post Code: {postcode}</p>
            </div>
          )}
          {/* Actions */}
          <div className="flex gap-4">
            <button
              className="w-full bg-green-600 text-white font-bold rounded py-2"
              onClick={handleCheckout}
              disabled={isProcessing}
            >
              {isProcessing ? "Processing..." : "FINISH THE ORDER"}
            </button>
            <Link
              href="/"
              className="w-full bg-orange-500 text-center text-white font-bold rounded py-2"
            >
              ORDER MORE
            </Link>
          </div>
        </div>

        {/* Order Summary */}
        <div className="w-full md:w-1/2">
          <OrderDetailsWrapper />
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
