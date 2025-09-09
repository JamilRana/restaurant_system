// app/admin/restaurants/page.tsx
"use client";

import { RouteLoader } from "@/components/RouteLoader";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Image from "next/image";

type Restaurant = {
  id: number;
  name: string;
  email: string;
  address: string | null;
  logoPath: string | null;
  deliveryTime: string | null;
  collectionTime: string | null;
};

export default function ManageRestaurants() {
  const { data: session, status } = useSession();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "ADMIN") return;

    fetchRestaurant();
  }, [session, status]);

  const fetchRestaurant = async () => {
    try {
      const res = await fetch("/api/admin/restaurants", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        setRestaurant(data);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      console.error("Failed to fetch restaurant:", err);
      alert("Could not load restaurant data. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (formData: FormData) => {
    const deliveryTime = formData.get("deliveryTime") as string;
    const collectionTime = formData.get("collectionTime") as string;

    if (!deliveryTime.trim() || !collectionTime.trim()) {
      alert("Delivery and Collection times are required.");
      return;
    }

    try {
      const res = await fetch("/api/admin/restaurants", {
        method: "PUT",
        body: formData,
      });

      const result = await res.json();

      if (res.ok) {
        alert("✅ Restaurant settings updated!");
        setIsEditing(false);
        setRestaurant((prev) => ({
          ...prev!,
          deliveryTime,
          collectionTime,
          logoPath: result.logoPath || prev?.logoPath,
        }));
      } else {
        alert(`❌ Error: ${result.error || "Update failed"}`);
      }
    } catch (err) {
      console.error("Submission error:", err);
      alert("Network error. Could not save changes.");
    }
  };

  if (status === "loading") return <RouteLoader />;
  if (!session || session.user.role !== "ADMIN") return null;
  if (loading)
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        <span className="ml-3 text-slate-600">Loading settings...</span>
      </div>
    );
  if (!restaurant)
    return (
      <div className="text-center p-6 text-slate-500">No data available.</div>
    );

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Restaurant Settings
          </h1>
          <p className="text-slate-600 mt-1">Manage your restaurant details</p>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl shadow-sm hover:shadow transition-all duration-200 font-medium"
          >
            Edit Settings
          </button>
        )}
      </div>

      {isEditing ? (
        <RestaurantEditForm
          restaurant={restaurant}
          onSubmit={handleSubmit}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 space-y-5">
            <DetailItem label="Name" value={restaurant.name} />
            <DetailItem label="Email" value={restaurant.email} />
            <DetailItem label="Address" value={restaurant.address || "—"} />
            <DetailItem
              label="Delivery Time"
              value={restaurant.deliveryTime || "—"}
            />
            <DetailItem
              label="Collection Time"
              value={restaurant.collectionTime || "—"}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Reusable Detail Item
function DetailItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-sm font-medium text-slate-700 mb-1">{label}</h3>
      <div className="text-slate-900 text-base">{value}</div>
    </div>
  );
}

// Edit Form Component
function RestaurantEditForm({
  restaurant,
  onSubmit,
  onCancel,
}: {
  restaurant: Restaurant;
  onSubmit: (formData: FormData) => void;
  onCancel: () => void;
}) {
  const [deliveryTime, setDeliveryTime] = useState(
    restaurant.deliveryTime || ""
  );
  const [collectionTime, setCollectionTime] = useState(
    restaurant.collectionTime || ""
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("deliveryTime", deliveryTime.trim());
    formData.append("collectionTime", collectionTime.trim());
    onSubmit(formData);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5"
    >
      {/* Delivery Time */}
      <div>
        <label
          htmlFor="deliveryTime"
          className="block text-sm font-medium text-slate-700 mb-1.5"
        >
          Delivery Time *
        </label>
        <input
          id="deliveryTime"
          type="text"
          value={deliveryTime}
          onChange={(e) => setDeliveryTime(e.target.value)}
          placeholder="e.g., 30–45 mins"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          required
        />
      </div>

      {/* Collection Time */}
      <div>
        <label
          htmlFor="collectionTime"
          className="block text-sm font-medium text-slate-700 mb-1.5"
        >
          Collection Time *
        </label>
        <input
          id="collectionTime"
          type="text"
          value={collectionTime}
          onChange={(e) => setCollectionTime(e.target.value)}
          placeholder="e.g., 15 mins"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          required
        />
      </div>
      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition font-medium"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg shadow-sm hover:shadow transition font-medium"
        >
          Save Changes
        </button>
      </div>
    </form>
  );
}
