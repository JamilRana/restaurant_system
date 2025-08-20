// components/DeliveryOptionSelector.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useBasketStore } from "@/app/store/basketStore";
import { useSession } from "next-auth/react";

type PostcodeResult = {
  postcode: string;
  deliveryFee: number;
};

export default function DeliveryOptionSelector() {
  const { data: session } = useSession();
  const router = useRouter();

  const {
    deliveryMode,
    postcode,
    address,
    deliveryFee,
    orderNote,
    basketItems,
    guestName,
    guestEmail,
    setDeliveryMode,
    setPostcode,
    setAddress,
    setDeliveryFee,
    setOrderNote,
    setGuestInfo,
  } = useBasketStore();

  const [searchInput, setSearchInput] = useState("");
  const [results, setResults] = useState<PostcodeResult[]>([]);
  const [loading, setLoading] = useState(false);

  const [localName, setLocalName] = useState("");
  const [localEmail, setLocalEmail] = useState("");

  useEffect(() => {
    if (!session) return;

    if (session.user?.postcode && !postcode) {
      setPostcode(session.user.postcode);
      setSearchInput(session.user.postcode);
    }

    if (session.user?.address && !address) {
      setAddress(session.user.address);
    }
  }, [session, postcode, address, setPostcode, setAddress, setSearchInput]);

  useEffect(() => {
    if (postcode) {
      setSearchInput(postcode);
    }
  }, [postcode]);

  useEffect(() => {
    setLocalName(guestName);
    setLocalEmail(guestEmail);
  }, [guestName, guestEmail]);

  // Fetch postcode results
  useEffect(() => {
    if (deliveryMode !== "delivery" || !searchInput) {
      setResults([]);
      return;
    }

    const fetchResults = async () => {
      try {
        setLoading(true);
        const origin =
          typeof window !== "undefined" ? window.location.origin : "";
        const res = await fetch(
          `${origin}/api/postcode-search?query=${searchInput}&restaurantId=1`
        );
        const data = await res.json();
        setResults(Array.isArray(data.zones) ? data.zones : []);
      } catch (err) {
        console.error("Search failed:", err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [searchInput, deliveryMode]);

  const selectPostcode = (result: PostcodeResult) => {
    setPostcode(result.postcode);
    setDeliveryFee(result.deliveryFee);
    setSearchInput(result.postcode);
    setResults([]);
  };

  useEffect(() => {
    if (session?.user?.postcode && !postcode) {
      setPostcode(session.user.postcode);
      setSearchInput(session.user.postcode);
    }
  }, [session, postcode, setPostcode]);

  useEffect(() => {
    if (!session && deliveryMode !== "collection") {
      setDeliveryMode("collection");
    }
  }, [session, deliveryMode, setDeliveryMode]);

  const handleCheckout = () => {
    // If guest checkout, ensure name/email
    if (!session && (!guestName.trim() || !guestEmail.trim())) {
      alert("Please enter your name and email to continue");
      return;
    }

    // If valid, go to checkout
    router.push("/checkout");
  };

  return (
    <div className="mt-4 space-y-4 text-xs">
      {/* Delivery Mode */}
      <div className="flex justify-between gap-2">
        <div
          onClick={() => setDeliveryMode("delivery")}
          className={`flex-1 border p-3 rounded cursor-pointer ${
            deliveryMode === "delivery"
              ? "bg-white border-green-600 text-green-600 font-semibold"
              : "text-gray-400"
          }`}
        >
          <p className="text-2xl">🚚</p>
          <p>Delivery</p>
        </div>
        <div
          onClick={() => setDeliveryMode("collection")}
          className={`flex-1 border p-3 rounded cursor-pointer ${
            deliveryMode === "collection"
              ? "bg-white border-green-600 text-green-600 font-semibold"
              : "text-gray-400"
          }`}
        >
          <p className="text-2xl">🏬</p>
          <p>Collection</p>
        </div>
      </div>

      {/* Delivery Form */}
      {deliveryMode === "delivery" && !session && (
        <p className="text-red-500">Login required for delivery</p>
      )}

      {deliveryMode === "delivery" && session && (
        <div className="text-left mt-2">
          <h3 className="font-bold text-sm text-black mb-1">
            Postcode{" "}
            <span className="text-blue-700 underline">(Start typing)</span>
          </h3>
          <div className="relative">
            <div className="relative">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="e.g. SW1A"
                className="w-full border p-2 rounded text-sm"
              />

              {/* Results Dropdown */}
              {loading ? (
                <div className="absolute z-10 mt-1 w-full bg-white border rounded shadow-lg p-2">
                  <p className="text-xs text-gray-500">Searching...</p>
                </div>
              ) : results.length > 0 ? (
                <ul className="absolute z-10 mt-1 w-full bg-white border rounded shadow-lg max-h-48 overflow-y-auto">
                  {results.map((result, i) => (
                    <li
                      key={i}
                      onMouseDown={() => selectPostcode(result)}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                    >
                      <strong>{result.postcode}</strong> - £{result.deliveryFee}{" "}
                      fee
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <label className="block mt-3 mb-1 text-xs">Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Street, City..."
              className="w-full border px-2 py-1 rounded text-sm"
            />
          </div>
        </div>
      )}

      {/* Guest Checkout for Collection */}
      {deliveryMode === "collection" && !session && (
        <div className="mb-6 p-4 border rounded bg-yellow-50">
          <h3 className="font-semibold">Checkout as Guest</h3>
          <p className="text-sm text-gray-600 mb-2">
            You can create an account later to track your orders.
          </p>

          <div className="space-y-2 text-sm">
            <input
              type="text"
              placeholder="Your Name"
              defaultValue={guestName}
              onChange={(e) => setGuestInfo(e.target.value, guestEmail)}
              className="w-full border px-2 py-1 rounded"
              aria-label="Your Name"
            />
            <input
              type="email"
              placeholder="Your Email"
              defaultValue={guestEmail}
              onChange={(e) => setGuestInfo(guestName, e.target.value)}
              className="w-full border px-2 py-1 rounded"
              aria-label="Your Email"
            />
          </div>
        </div>
      )}

      {/* Checkout Button */}
      {basketItems.length === 0 ? (
        <p className="text-gray-500 text-center">Your basket is empty.</p>
      ) : (
        <button
          onClick={handleCheckout}
          className="w-full mt-4 bg-green-600 text-white font-bold py-2 rounded hover:bg-green-700 flex items-center justify-center gap-2"
        >
          <span>➡️</span> Checkout
        </button>
      )}
    </div>
  );
}
