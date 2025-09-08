// components/ReservationForm.tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";
import { useRestaurantStore } from "@/app/store/restaurantStore";
import { useTimeSlots } from "@/lib/useTimeSlots";

export default function ReservationForm() {
  const { data: session } = useSession();
  const { restaurant } = useRestaurantStore();
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");

  const [formData, setFormData] = useState({
    name: session?.user?.name || "",
    phone: session?.user?.phone || "",
    email: session?.user?.email || "",
    guests: 2,
    date: new Date().toISOString().split("T")[0],
    time: "",
    duration: 90, // 90 mins standard
    notes: "",
  });

  // Derived state
  const availableTimeSlots = useTimeSlots(formData.date);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const dateTime = new Date(`${formData.date}T${formData.time}`);
    const now = new Date();

    if (dateTime < now) {
      toast.error("Please select a future date and time.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/tables/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          guests: parseInt(formData.guests as any),
          date: dateTime.toISOString(),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("🎉 Reservation confirmed! See you soon.");
        setFormData({
          name: session?.user?.name || "",
          phone: "",
          email: session?.user?.email || "",
          guests: 2,
          date: "",
          time: "",
          duration: 90,
          notes: "",
        });
      } else {
        toast.error(data.error || "Reservation failed. Try again.");
      }
    } catch (err) {
      toast.error("❌ Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="relative py-8 px-4">
      <form
        onSubmit={handleSubmit}
        className="max-w-lg mx-auto bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-300 to-orange-500 px-2 py-4 text-center text-white">
          <h2 className="text-xl font-bold mb-2">Book a Table</h2>
          <p className="text-blue-100">
            Reserve your spot at {restaurant?.name || "our restaurant"}
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Name */}
          <div>
            <label className="block mb-2 font-semibold text-gray-700">
              Full Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full border border-gray-300 px-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="Name"
              required
            />
          </div>

          {/* Phone & Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-2 font-semibold text-gray-700">
                Phone *
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full border border-gray-300 px-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="+44 7123 456789"
                required
              />
            </div>

            <div>
              <label className="block mb-2 font-semibold text-gray-700">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full border border-gray-300 px-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="your email"
                disabled={!!session?.user?.email}
              />
            </div>
          </div>

          {/* Guests & Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-2 font-semibold text-gray-700">
                Guests *
              </label>
              <select
                name="guests"
                value={formData.guests}
                onChange={handleChange}
                className="w-full border border-gray-300 px-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                required
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? "Guest" : "Guests"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-2 font-semibold text-gray-700">
                Date *
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                min={today}
                className="w-full border border-gray-300 px-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                required
              />
            </div>
          </div>

          {/* Time Slot */}
          <div>
            <label className="block mb-2 font-semibold text-gray-700">
              Preferred Time *
            </label>
            {formData.date ? (
              <select
                name="time"
                value={formData.time}
                onChange={handleChange}
                className="w-full border border-gray-300 px-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                required
              >
                <option value="">Select a time</option>
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
            ) : (
              <p className="text-gray-400 italic">Please select a date first</p>
            )}
          </div>

          {/* Special Requests */}
          <div>
            <label className="block mb-2 font-semibold text-gray-700">
              Special Requests
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full border border-gray-300 px-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="Birthday celebration, high chair, wheelchair access, etc."
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-lg font-semibold text-lg hover:from-green-600 hover:to-green-700 disabled:opacity-80 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-md"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Booking...
              </span>
            ) : (
              "Confirm Reservation"
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 text-center text-sm text-gray-500 border-t">
          We’ll send a confirmation to your email.
        </div>
      </form>
    </div>
  );
}
