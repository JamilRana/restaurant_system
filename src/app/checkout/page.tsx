// app/checkout/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import OrderDetailsWrapper from "@/components/Order/OrderDetailsWrapper";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useBasketStore } from "../store/basketStore";
import { useSession } from "next-auth/react";
import { useRestaurantStore } from "../store/restaurantStore";
import { RouteLoader } from "@/components/RouteLoader";

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

  const restInfo = useRestaurantStore();
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

  // Auto-set to collection if guest
  useEffect(() => {
    if (status === "loading") return;

    // If not logged in, force collection
    if (!session && deliveryMode !== "collection") {
      setDeliveryMode("collection");
    }

    // If no session and no guest info, redirect
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

  // Generate time slots
  useEffect(() => {
    if (!restInfo.restaurant) return;
    const collectionTime =
      restInfo.restaurant.collectionTime?.trim() || "18:00-22:00";
    const [startStr, endStr] = collectionTime.split("-").map((s) => s.trim());
    if (!startStr || !endStr) return;

    const parseHour = (time: string) => {
      const match = time.match(/^(\d{1,2}):(\d{2})$/);
      return match ? parseInt(match[1], 10) : null;
    };

    const startHour = parseHour(startStr) ?? 18;
    const endHour = parseHour(endStr) ?? 22;
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    let hour = currentMinute <= 30 ? currentHour : currentHour + 1;
    let minute = currentMinute <= 30 ? 30 : 0;
    hour = Math.max(hour, startHour);

    const slots = [];
    while (hour < endHour || (hour === endHour && minute === 0)) {
      slots.push(
        `${hour.toString().padStart(2, "0")}:${minute === 0 ? "00" : "30"}`
      );
      minute = (minute + 30) % 60;
      if (minute === 0) hour++;
    }

    if (slots.length > 0 && !timeSlot) setTimeSlot(slots[0]);
  }, [restInfo.restaurant, timeSlot]);

  // Apply promo
  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;

    setIsApplying(true); // ✅ Add this
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
          restaurantId: restInfo.restaurant?.id,
          totalAmount: preDiscountTotal, // Pass pre-discount total
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

    // Clear previous errors
    setErrors({ timeSlot: "", paymentMethod: "", address: "" });

    let hasError = false;

    // Validation
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

    // If any error, stop here
    if (hasError) return;

    // ✅ Now we're ready to process
    setIsProcessing(true);

    // app/checkout/page.tsx
    // Inside handleCheckout
    if (paymentMethod === "cash") {
      try {
        const res = await fetch("/api/orders/confirm-cash", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            totalAmount,
            deliveryType: deliveryMode === "delivery" ? "DELIVERY" : "PICKUP",
            paymentStatus: "paid",
            paymentMethod: "cash",
            status: "placed",
            timeSlot,
            address: deliveryMode === "delivery" ? address : null,
            postcode: deliveryMode === "delivery" ? postcode : null,
            orderNote,
            promoCode: appliedPromo?.code || null,
            customerId: session?.user?.id || null,
            restaurantId: restInfo.restaurant?.id,
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

        useBasketStore.getState().clearBasket();
        router.push("/OrderHistory");
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
    <RouteLoader />;
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
      <div className="flex flex-col md:flex-row gap-8">
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
                setErrors({ ...errors, timeSlot: "" });
              }}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="">Select time</option>
              {restInfo.restaurant ? (
                (() => {
                  const collectionTime =
                    restInfo.restaurant.collectionTime?.trim() || "18:00-22:00";
                  const [startStr, endStr] = collectionTime
                    .split("-")
                    .map((s) => s.trim());
                  if (!startStr || !endStr)
                    return <option disabled>Invalid time format</option>;
                  const parseHour = (time: string) => {
                    const match = time.match(/^(\d{1,2}):(\d{2})$/);
                    return match ? parseInt(match[1], 10) : null;
                  };
                  const startHour = parseHour(startStr) ?? 18;
                  const endHour = parseHour(endStr) ?? 22;
                  const now = new Date();
                  const currentHour = now.getHours();
                  const currentMinute = now.getMinutes();
                  let hour =
                    currentMinute <= 30 ? currentHour : currentHour + 1;
                  let minute = currentMinute <= 30 ? 30 : 0;
                  hour = Math.max(hour, startHour);
                  const slots = [];
                  while (hour < endHour || (hour === endHour && minute === 0)) {
                    slots.push(
                      `${hour.toString().padStart(2, "0")}:${
                        minute === 0 ? "00" : "30"
                      }`
                    );
                    minute = (minute + 30) % 60;
                    if (minute === 0) hour++;
                  }
                  return slots.length === 0 ? (
                    <option disabled>No available slots</option>
                  ) : (
                    slots.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))
                  );
                })()
              ) : (
                <option disabled>Loading...</option>
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
          {/*
         
          <div className="mt-6 p-4 border rounded bg-gray-50">
            <h3 className="font-semibold mb-2">Have a Promo Code?</h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter code"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                className="flex-1 border px-3 py-1 rounded text-sm"
              />
              <button
                onClick={handleApplyPromo}
                disabled={isApplying}
                className="bg-blue-600 text-white px-4 py-1 rounded text-sm disabled:bg-gray-400"
              >
                {isApplying ? "Checking..." : "Apply"}
              </button>
            </div>
            {appliedPromo && (
              <p className="text-green-600 text-sm mt-2">
                ✓ {appliedPromo.code} applied! Saved £{discountAmount.toFixed(2)}
              </p>
            )}
            {promoError && (
              <p className="text-red-500 text-sm mt-2">{promoError}</p>
            )}
          </div>
}*/}

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

      {/* Delivery Address */}
      {deliveryMode === "delivery" && address && postcode && (
        <div className="mt-4">
          <h3 className="font-semibold text-lg">Delivery Address</h3>
          <p>{address}</p>
          <p>Post Code: {postcode}</p>
        </div>
      )}
    </div>
  );
};

export default CheckoutPage;
