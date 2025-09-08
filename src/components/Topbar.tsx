"use client";
import { useRestaurantStore } from "@/app/store/restaurantStore";
import Image from "next/image";
import React from "react";

function Topbar() {
  const rest = useRestaurantStore();
  return (
    <div className="bg-orange-500 text-white text-[9px] md:text-sm py-1 md:py-3 px-2 md:px-4">
      <div className=" flex flex-row justify-center gap-2 md:gap-6 items-center">
        <span className="flex items-center space-x-1">
          <span>⏱</span>
          <span>Collection: {rest.restaurant?.collectionTime}</span>
        </span>
        <span className="flex items-center space-x-1">
          <span>⏱</span>
          <span>Delivery: {rest.restaurant?.deliveryTime}</span>
        </span>
        <span className="flex items-center space-x-1">
          <span>
            <Image src="/icons/location.png" alt="" width={15} height={5} />
          </span>
          <span>{rest.restaurant?.address}</span>
        </span>
      </div>
    </div>
  );
}

export default Topbar;
