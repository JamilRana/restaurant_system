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
    Name,
    Email,
    Phone,
    setDeliveryMode,
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

    if (!session && !Name && !Email && !Phone) {
      router.push("/Auth");
    }
  }, [
    session,
    status,
    deliveryMode,
    setDeliveryMode,
    Name,
    Email,
    Phone,
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
          restaurantId: 1,
          totalAmount: preDiscountTotal,
          email: Email,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Invalid promo code");
      }

      const data = await res.json();

      // ✅ Update BOTH appliedPromo AND discountAmount
      const store = useBasketStore.getState();
      store.setAppliedPromo({
        code: data.code,
        discountAmount: data.discountAmount,
      });
      store.setDiscount(data.discountAmount); // ✅ This triggers re-render
    } catch (error: any) {
      setPromoError(error.message);
      clearPromo(); // This also clears discountAmount
    } finally {
      setIsApplying(false);
    }
  };

  // Handle checkout
  const handleCheckout = async () => {
    if (isProcessing) return;
    setErrors({ timeSlot: "", paymentMethod: "", address: "" });

    let hasError = false;
    console.log("isProcessing:", isProcessing);
    console.log("hasError:", hasError);
    console.log("paymentMethod:", paymentMethod);
    console.log("timeSlot:", timeSlot);

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
      if (deliveryMode === "delivery") {
        if (!session) {
          setErrors((prev) => ({
            ...prev,
            address: "Login required for delivery",
          }));
          hasError = true;
        } else if (!postcode || !address) {
          setErrors((prev) => ({
            ...prev,
            address: "Please enter delivery address",
          }));
          hasError = true;
        }
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
            paymentStatus: "PENDING",
            paymentMethod: "CASH",
            status: "PLACED",
            timeSlot,
            address: deliveryMode === "delivery" ? address : null,
            postcode: deliveryMode === "delivery" ? postcode : null,
            orderNote,
            promoCode: appliedPromo?.code || null,
            customerId: session?.user?.id || null,
            deliveryFee,
            discountAmount,
            items: basketItems.map((item) => ({
              id: item.id, // ✅ matches `item.id`
              quantity: item.quantity,
              optionId: item.optionId || null, // ✅ matches `item.optionId`
            })),
            isGuest: !session,
            Name: !session ? Name : session.user?.name,
            Email: !session ? Email : session.user?.email,
            Phone: !session ? Phone : session.user?.phone,
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
            isGuest: !session,
            Name: !session ? Name : session.user?.name,
            Email: !session ? Email : session.user?.email,
            Phone: !session ? Phone : session.user?.phone,
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
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-center sm:text-left">
        Checkout
      </h1>

      {/* User Info */}
      <div className="mb-6">
        {session ? (
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <h2 className="text-lg font-semibold">
              Welcome Back, {session.user?.name}!
            </h2>
            <span className="text-gray-700">{session.user?.email}</span>
          </div>
        ) : (
          <div className="mb-4 p-3 border rounded bg-yellow-50 text-sm">
            <h3 className="font-semibold">Guest: {Name}</h3>
            <p>{Email}</p>
          </div>
        )}

        {/* Main Checkout Body */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: Form */}
          <div className="flex-1 min-w-0">
            <div className="space-y-6">
              {/* Time Slot */}
              <div>
                <label className="block mb-2 font-medium text-sm">
                  Choose Time Slot
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
                  <p className="text-red-500 text-sm mt-1">{errors.timeSlot}</p>
                )}
              </div>

              {/* Promo Code */}
              <div>
                <label className="block mb-2 font-medium text-sm">
                  Promo Code (Optional)
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="Enter promo code"
                    value={promoCode}
                    onChange={(e) =>
                      useBasketStore.getState().setPromoCode(e.target.value)
                    }
                    className="flex-1 border px-3 py-2 rounded text-sm"
                  />
                  <button
                    onClick={handleApplyPromo}
                    disabled={isApplying || isProcessing || !promoCode.trim()}
                    className="bg-green-600 text-white font-bold rounded px-4 py-2 whitespace-nowrap"
                  >
                    {isApplying ? (
                      <span className="flex items-center justify-center">
                        <svg
                          className="animate-spin h-5 w-5 mr-2"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                        Applying...
                      </span>
                    ) : (
                      "Apply Promo"
                    )}
                  </button>
                </div>

                {/* Applied Promo */}
                {appliedPromo && !promoError && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded text-sm flex items-center justify-between">
                    <span className="text-green-800">
                      ✅ {appliedPromo.code} applied (-£
                      {appliedPromo.discountAmount.toFixed(2)})
                    </span>
                    <button
                      onClick={() => {
                        clearPromo();
                        setPromoError("");
                      }}
                      className="text-red-500 hover:text-red-700 text-xs underline ml-2"
                    >
                      Remove
                    </button>
                  </div>
                )}

                {promoError && (
                  <p className="text-red-500 text-sm mt-2">{promoError}</p>
                )}
              </div>

              {/* Payment Method */}
              <div>
                <label className="block mb-2 font-medium text-sm">
                  Payment Method
                </label>
                <div className="space-y-2 text-sm">
                  {session && (
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="payment"
                        value="cash"
                        checked={paymentMethod === "cash"}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                      />
                      Cash (Pay on delivery/pickup)
                    </label>
                  )}
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="payment"
                      value="card"
                      checked={paymentMethod === "card"}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    />
                    Credit/Debit Card
                  </label>
                </div>
                {errors.paymentMethod && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.paymentMethod}
                  </p>
                )}
              </div>

              {/* Delivery Address */}
              {deliveryMode === "delivery" && address && postcode && (
                <div className="mt-4 p-3 bg-gray-50 rounded">
                  <h3 className="font-semibold text-sm">Delivery Address</h3>
                  <p className="text-sm">{address}</p>
                  <p className="text-sm">Post Code: {postcode}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <button
                  onClick={handleCheckout}
                  disabled={isProcessing}
                  className="flex-1 bg-green-600 text-white font-bold rounded py-3"
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="animate-spin h-5 w-5 mr-2"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    "FINISH ORDER"
                  )}
                </button>
                <Link
                  href="/"
                  className="flex-1 bg-orange-500 text-white font-bold text-center rounded py-3"
                >
                  ORDER MORE
                </Link>
              </div>
            </div>
          </div>

          {/* Right: Order Summary */}
          <div className="w-full lg:w-96 mt-8 lg:mt-0">
            <OrderDetailsWrapper />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
