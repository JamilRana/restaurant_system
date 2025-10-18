// src/components/CategorySection.tsx
"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useBasketStore } from "@/app/store/basketStore";
import { useRestaurantStore } from "@/app/store/restaurantStore";

type CategorySectionProps = {
  category: string;
  dishes: {
    id: number;
    name: string;
    description: string | null;
    price: number;
    image: string | null;
    options: { id: number; name: string; price: number }[];
  }[];
  expanded: boolean;
  onToggle: () => void;
};

const CategorySection = ({
  category,
  dishes,
  expanded,
  onToggle,
}: CategorySectionProps) => {
  const [selectedOptions, setSelectedOptions] = useState<{
    [key: number]: number;
  }>({});
  const restInfo = useRestaurantStore();

  // ✅ Update current restaurant on mount
  useEffect(() => {
    useBasketStore
      .getState()
      .setCurrentRestaurantId(restInfo.restaurant?.id || null);
  }, [restInfo.restaurant?.id]);

  const handleOptionClick = (dishId: number, optionIndex: number) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [dishId]: optionIndex,
    }));
  };

  const handleAddToBasket = (dish: any) => {
    const optionIndex = selectedOptions[dish.id] ?? 0;
    const selectedOption = dish.options?.[optionIndex];

    // ✅ Parse prices as numbers
    // Convert dish.price and option.price to numbers
    const basePrice = Number(dish.price) || 0;
    const extraPrice = selectedOption ? Number(selectedOption.price) || 0 : 0;

    // Now add them
    const finalPrice = basePrice + extraPrice; // ← This should be a number

    useBasketStore.getState().addToBasket({
      id: dish.id,
      name: dish.name,
      description: dish.description,
      image: dish.image,
      price: finalPrice, // Already number
      option: selectedOption || undefined,
      optionId: selectedOption?.id || null,
    });
  };
  return (
    <div className="mb-1">
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="w-full text-left p-4 bg-black text-white font-bold flex justify-between items-center"
      >
        <span>{category}</span>
        <span>{expanded ? "▲" : "▼"}</span>
      </button>

      {/* Dishes List */}
      {expanded && (
        <div className="bg-white">
          {dishes.map((dish) => {
            const optionIndex = selectedOptions[dish.id] ?? 0;
            const selectedOption = dish.options?.[optionIndex];
            const basePrice = Number(dish.price) || 0;
            const extraPrice = selectedOption
              ? Number(selectedOption.price) || 0
              : 0;
            const finalPrice = basePrice + extraPrice;

            return (
              <div key={dish.id} className="p-4 border-b last:border-b-0 ">
                <div className="flex flex-col sm:flex-row gap-3 items-start bg-red/30 backdrop-blur-md">
                  {/* Image */}
                  {dish.image && (
                    <div className="w-16 h-16 rounded overflow-hidden flex-shrink-0">
                      <Image
                        src={dish.image}
                        alt={dish.name}
                        width={64}
                        height={64}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  )}

                  {/* Dish Info */}
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                      <div>
                        <h4 className="font-semibold text-lg">{dish.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {dish.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-gray-900">
                          £{finalPrice.toFixed(2)}
                        </span>
                        <button
                          onClick={() => handleAddToBasket(dish)}
                          className="w-8 h-8 flex items-center justify-center bg-black text-white rounded-full hover:bg-gray-800 transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Options */}
                    {dish.options && dish.options.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {dish.options.map((option, index) => (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => handleOptionClick(dish.id, index)}
                            className={`px-3 py-1 text-xs font-medium rounded-full transition-all duration-200 whitespace-nowrap ${
                              optionIndex === index
                                ? "bg-green-500 text-white shadow-inner"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                          >
                            {option.name} (+£{option.price})
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CategorySection;
