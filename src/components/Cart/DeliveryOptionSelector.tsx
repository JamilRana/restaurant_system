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
    basketItems,
    setDeliveryMode,
    setPostcode,
    setAddress,
    setDeliveryFee,
  } = useBasketStore();

  const [searchInput, setSearchInput] = useState("");
  const [results, setResults] = useState<PostcodeResult[]>([]);
  const [loading, setLoading] = useState(false);

  // Sync searchInput with postcode on load
  useEffect(() => {
    if (postcode) {
      setSearchInput(postcode);
    }
  }, [postcode]);

  useEffect(() => {
    if (deliveryMode !== "delivery" || !searchInput) {
      setResults([]);
      return;
    }

    const fetchResults = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/postcodeSearch?query=${searchInput}&restaurantId=1`
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

  // Handle selection
  const selectPostcode = (result: PostcodeResult) => {
    setPostcode(result.postcode);
    setDeliveryFee(result.deliveryFee);
    setSearchInput(result.postcode);
    setResults([]);
  };

  // Pre-fill from session
  useEffect(() => {
    if (session?.user?.postcode && !postcode) {
      setPostcode(session.user.postcode);
      setSearchInput(session.user.postcode);
    }
  }, [session, postcode, setPostcode]);

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
      {deliveryMode === "delivery" && (
        <div className="text-left mt-2">
          <h3 className="font-bold text-sm text-black mb-1">
            Postcode{" "}
            <span className="text-blue-700 underline">(Start typing)</span>
          </h3>

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
                    onClick={() => selectPostcode(result)}
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
      )}

      {deliveryMode === "collection" && (
        <p className="text-center text-gray-600 text-sm">
          Pickup available at restaurant.
        </p>
      )}

      {/* Checkout Button */}
      {basketItems.length === 0 ? (
        <p className="text-gray-500 text-center">Your basket is empty.</p>
      ) : (
        <button
          onClick={() => router.push("/checkout")}
          className="w-full mt-4 bg-green-600 text-white font-bold py-2 rounded hover:bg-green-700 flex items-center justify-center gap-2"
        >
          <span>➡️</span> Checkout
        </button>
      )}
    </div>
  );
}
