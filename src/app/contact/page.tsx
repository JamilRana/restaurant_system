"use client";
import React from "react";
import { useRestaurantStore } from "../store/restaurantStore";

export default function Contact() {
    const res =useRestaurantStore();
  return (
      <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
        {res.restaurant?.name}
      </div>
  );
};

