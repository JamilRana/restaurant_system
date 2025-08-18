//store/restaurantStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware"; // ✅ Import added

export type RestaurantType = {
  id: number;
  name: string;
  email: string;
  address?: string;
  logoUrl?: string;
  deliveryTime?: string;
  collectionTime?: string;
  createdAt: string;
  updatedAt: string;
};

interface RestaurantState {
  restaurant: RestaurantType | null;
  setRestaurant: (data: RestaurantType) => void;
  fetchRestaurant: () => Promise<void>;
}

const fetchRestaurantFromAPI = async (): Promise<RestaurantType> => {
  const res = await fetch("/api/restaurant/info");
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to fetch restaurant");
  }
  return res.json();
};

export const useRestaurantStore = create<RestaurantState>()(
  persist(
    (set) => ({
      restaurant: null,

      setRestaurant: (data) => set({ restaurant: data }),

      fetchRestaurant: async () => {
        try {
          const data = await fetchRestaurantFromAPI();
          set({ restaurant: data });
        } catch (err) {
          console.error("Failed to load restaurant:", err);
        }
      },
    }),
    {
      name: "restaurant-store", // 🔐 Unique key in localStorage
    }
  )
);