// components/MenuSidebar.tsx
"use client";

import Image from "next/image";
import React from "react";

interface Props {
  categories: { id: number; name: string }[];
  activeCategory: number;
  onScrollTo: (id: number) => void;
}

const MenuSidebar: React.FC<Props> = ({
  categories,
  activeCategory,
  onScrollTo,
}) => {
  const handleClick = (id: number, name: string) => {
    // Update hash
    const slug = name.toLowerCase().replace(/\s+/g, "-");
    window.location.hash = slug;

    // Trigger scroll in MenuPage
    onScrollTo(id);
  };

  return (
    <div className="bg-[#F2F2F2] px-4 py-6 min-w-full text-sm font-medium text-black sticky top-0 h-screen overflow-y-auto">
      {/* Heading */}
      <div className="flex items-center space-x-2 mb-6">
        <span className="text-2xl">
          <Image src="/icons/menu.png" alt="menu" width={30} height={30} />
        </span>
        <h2 className="text-xl font-bold">Menu</h2>
      </div>

      {/* Menu Items */}
      <ul className="space-y-3">
        {categories.map((category) => (
          <li key={category.id}>
            <button
              onClick={() => handleClick(category.id, category.name)}
              className={`px-3 py-2 w-full text-left rounded cursor-pointer transition-all duration-200 ${
                activeCategory === category.id
                  ? "bg-[#0C0C28] text-white font-bold"
                  : "text-gray-800 hover:bg-gray-300 hover:text-orange-600"
              }`}
            >
              {category.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MenuSidebar;
