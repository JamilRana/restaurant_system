// app/admin/restaurants/page.tsx
"use client";
import { RouteLoader } from "@/components/RouteLoader";
import { useEffect, useState } from "react";

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
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchRestaurant();
  }, []);

  const fetchRestaurant = async () => {
    try {
      const res = await fetch("/api/admin/restaurants", {
        cache: "no-store",
      });
      const data = await res.json();
      if (res.ok) {
        setRestaurant(data);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      alert("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (formData: FormData) => {
    const deliveryTime = formData.get("deliveryTime") as string;
    const collectionTime = formData.get("collectionTime") as string;
    const logo = formData.get("logo") as File | null;

    if (!deliveryTime || !collectionTime) {
      alert("All fields are required");
      return;
    }

    const submitData = new FormData();
    submitData.append("deliveryTime", deliveryTime);
    submitData.append("collectionTime", collectionTime);
    if (logo) submitData.append("logo", logo);

    try {
      const res = await fetch("/api/admin/restaurants", {
        method: "PUT",
        body: submitData,
      });

      if (res.ok) {
        alert("Restaurant settings updated!");
        setIsEditing(false);
        fetchRestaurant();
      } else {
        const error = await res.json();
        alert(`Error: ${error.error}`);
      }
    } catch (err) {
      console.error("Submit error:", err);
      alert("Network error");
    }
  };

  if (loading) {
    <RouteLoader />;
  }
  if (!restaurant)
    return <p className="p-6 text-red-500">Restaurant not found</p>;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Restaurant Settings</h1>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
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
        <div className="bg-white p-6 border rounded-lg space-y-4">
          <div>
            <h2 className="font-semibold">Name</h2>
            <p>{restaurant.name}</p>
          </div>
          <div>
            <h2 className="font-semibold">Email</h2>
            <p>{restaurant.email}</p>
          </div>
          <div>
            <h2 className="font-semibold">Address</h2>
            <p>{restaurant.address || "—"}</p>
          </div>
          <div>
            <h2 className="font-semibold">Logo</h2>
            {restaurant.logoPath ? (
              <img src={restaurant.logoPath} alt="Logo" className="h-16 mt-2" />
            ) : (
              <p>—</p>
            )}
          </div>
          <div>
            <h2 className="font-semibold">Delivery Time</h2>
            <p>{restaurant.deliveryTime || "—"}</p>
          </div>
          <div>
            <h2 className="font-semibold">Collection Time</h2>
            <p>{restaurant.collectionTime || "—"}</p>
          </div>
        </div>
      )}
    </div>
  );
}

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
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(
    restaurant.logoPath
  );

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("deliveryTime", deliveryTime);
    formData.append("collectionTime", collectionTime);
    if (logoFile) formData.append("logo", logoFile);
    onSubmit(formData);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-6 border rounded-lg space-y-4"
    >
      <div>
        <label className="block text-sm font-medium mb-1">
          Delivery Time *
        </label>
        <input
          type="text"
          value={deliveryTime}
          onChange={(e) => setDeliveryTime(e.target.value)}
          placeholder="e.g., 30-45 mins"
          className="w-full border px-3 py-2 rounded"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">
          Collection Time *
        </label>
        <input
          type="text"
          value={collectionTime}
          onChange={(e) => setCollectionTime(e.target.value)}
          placeholder="e.g., 15 mins"
          className="w-full border px-3 py-2 rounded"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Logo Image</label>
        <input
          type="file"
          accept="image/*"
          onChange={handleLogoChange}
          className="w-full"
        />
        {logoPreview && (
          <div className="mt-2">
            <img
              src={logoPreview}
              alt="Logo Preview"
              className="h-16 rounded"
            />
          </div>
        )}
      </div>
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border rounded hover:bg-gray-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Save Changes
        </button>
      </div>
    </form>
  );
}
