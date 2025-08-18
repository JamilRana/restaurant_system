"use client";

import { useEffect, useState } from "react";
import MenuPage from "@/components/Cart/MenuPages";
import { useRestaurantStore } from "./store/restaurantStore";

const HomePage = () => {
  const [activeCategory, setActiveCategory] = useState(0);
  return (
    <main>
      <RestaurantLoader />
      <MenuPage />
    </main>
  );
};

export default HomePage;

function RestaurantLoader() {
  const { restaurant, fetchRestaurant } = useRestaurantStore();

  useEffect(() => {
    if (!restaurant) {
      fetchRestaurant();
    }
  }, [restaurant]);

  return null; // This component only loads data
}
