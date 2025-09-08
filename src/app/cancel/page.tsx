// app/cancel/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CancelPage() {
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [type, setType] = useState<"reservation" | "order">("reservation");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, email, type }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(data.message);
        setTimeout(() => router.push("/"), 3000); // Go home after 3s
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto mt-10 bg-white shadow rounded-lg">
      <h1 className="text-2xl font-bold mb-6">
        Cancel {type === "reservation" ? "Reservation" : "Order"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Cancel Type */}
        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              name="type"
              value="reservation"
              checked={type === "reservation"}
              onChange={() => setType("reservation")}
              className="mr-2"
            />
            Reservation
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="type"
              value="order"
              checked={type === "order"}
              onChange={() => setType("order")}
              className="mr-2"
            />
            Order
          </label>
        </div>

        {/* Phone */}
        <div>
          <label className="block mb-1">Phone Number</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full border p-2 rounded"
            placeholder="e.g. 07123456789"
            required
          />
        </div>

        {/* Email */}
        <div>
          <label className="block mb-1">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border p-2 rounded"
            placeholder="you@example.com"
            required
          />
        </div>

        {/* Error */}
        {error && <p className="text-red-500 text-sm">{error}</p>}

        {/* Success */}
        {success && <p className="text-green-500 text-sm">{success}</p>}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-red-500 text-white py-2 rounded hover:bg-red-600 disabled:bg-gray-400"
        >
          {loading ? "Checking..." : "Cancel"}
        </button>
      </form>
    </div>
  );
}
