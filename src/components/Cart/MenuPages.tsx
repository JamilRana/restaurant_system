// app/menu/page.tsx
"use client";

import React, { useEffect, useState, useRef } from "react";
import MenuSidebar from "./MenuSidebar";
import Cart from "./Cart";
import CategorySection from "./CategorySection";
import { useBasketStore } from "@/app/store/basketStore";
import { RouteLoader } from "../RouteLoader";
import { MenuSkeleton } from "./MenuSkeleton";

const MenuPage = () => {
  const sectionRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<{ [key: number]: boolean }>({});
  const [activeCategoryId, setActiveCategoryId] = useState<number>(0);
  const [basketItemCount, setBasketItemCount] = useState(0);
  const tabContainerRef = useRef<HTMLDivElement>(null);

  // Fetch basket count (example with Zustand)
  useEffect(() => {
    const updateItemCount = () => {
      const basket = useBasketStore.getState().basketItems;
      setBasketItemCount(basket.length);
    };
    updateItemCount();
    const unsubscribe = useBasketStore.subscribe(updateItemCount);
    return () => unsubscribe();
  }, []);

  // Fetch categories
  useEffect(() => {
    setLoading(true);
    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/menu");
        if (!res.ok) throw new Error("Failed to load menu");
        const data = await res.json();
        setCategories(data);

        // Expand all by default
        const initialExpanded = Object.fromEntries(
          data.map((cat: any) => [cat.id, true])
        );
        setExpanded(initialExpanded);

        if (data.length > 0) {
          setActiveCategoryId(data[0].id);
        }
      } catch (err) {
        setError("Failed to load menu. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // Handle hash change
  useEffect(() => {
    if (categories.length === 0) return;

    const handleHashChange = () => {
      const hash = window.location.hash.slice(1).toLowerCase();
      if (hash) {
        const target = categories.find(
          (cat) => cat.name.toLowerCase() === hash
        );
        if (target) {
          setActiveCategoryId(target.id);
          setExpanded((prev) => ({ ...prev, [target.id]: true }));
          sectionRefs.current[target.id]?.scrollIntoView({
            behavior: "smooth",
          });
          setTimeout(() => {
            const el = sectionRefs.current[target.id];
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }, 100);
        }
      }
    };

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [categories]);

  const getScrollOffset = () => {
    if (window.innerWidth < 768) return 100; // mobile
    return 80; // desktop
  };

  const scrollToWithOffset = (el: HTMLElement) => {
    const offset = getScrollOffset();
    const y = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: y, behavior: "smooth" });
  };

  // Toggle category expand
  const toggleCategory = (id: number) => {
    const category = categories.find((cat: any) => cat.id === id);
    if (category) {
      window.location.hash = category.name.toLowerCase();
    }

    // Toggle current expanded state
    setExpanded((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));

    setActiveCategoryId(id);

    // Scroll after state updates
    setTimeout(() => {
      const el = sectionRefs.current[id];
      if (el) {
        //el.scrollIntoView({ behavior: "smooth", block: "start" });
        scrollToWithOffset(el);
      }
    }, 100);
  };

  // Scroll to basket
  const goToBasket = () => {
    const cartSection = document.getElementById("basket-section");
    cartSection?.scrollIntoView({ behavior: "smooth" });
  };

  // Toggle expand/collapse all
  const toggleExpandAll = () => {
    const allExpanded = categories.every((cat) => expanded[cat.id]);
    const newState = Object.fromEntries(
      categories.map((cat) => [cat.id, !allExpanded])
    );
    setExpanded(newState);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <MenuSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-red-500 text-center">
        {error}
        <button
          onClick={() => window.location.reload()}
          className="ml-4 text-blue-600 underline"
        >
          Retry
        </button>
      </div>
    );
  }
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Mobile: Category Tabs */}
      <div className="md:hidden bg-white border-b overflow-x-auto whitespace-nowrap sticky top-0 z-50 bg-white pt-4">
        <div className="flex py-2 px-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => toggleCategory(cat.id)}
              className={`px-5 py-2 mx-1 rounded-full text-sm font-medium transition ${
                activeCategoryId === cat.id
                  ? "bg-blue-600 text-white shadow"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              ref={(el) => {
                if (
                  activeCategoryId === cat.id &&
                  el &&
                  tabContainerRef.current
                ) {
                  el.scrollIntoView({ behavior: "smooth", inline: "center" });
                }
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Layout: Sidebar | Menu | Basket */}
      <div className="hidden md:grid md:grid-cols-4 md:gap-6 p-6 max-w-7xl mx-auto w-full">
        {/* Sidebar */}
        <div className="md:col-span-1">
          <div className="sticky top-20">
            <MenuSidebar
              categories={categories}
              activeCategory={activeCategoryId}
              onScrollTo={(id) => toggleCategory(id)} // ✅ Now triggers scroll
            />
          </div>
        </div>

        {/* Menu */}
        <div className="md:col-span-2 sticky top-20">
          <div className="flex justify-between items-center mb-4 md:justify-end ">
            <button
              onClick={toggleExpandAll}
              className="text-sm border px-3 py-1 rounded hover:bg-gray-50"
            >
              {categories.every((cat) => expanded[cat.id])
                ? "Collapse All"
                : "Expand All"}
            </button>
          </div>
          {categories.map((cat) => (
            <div
              key={cat.id}
              id={cat.name.toLowerCase()}
              ref={(el) => {
                sectionRefs.current[cat.id] = el;
              }}
            >
              <CategorySection
                category={cat.name}
                dishes={cat.foods}
                expanded={expanded[cat.id]}
                onToggle={() => toggleCategory(cat.id)}
              />
            </div>
          ))}
        </div>

        {/* Basket */}
        <div className="md:col-span-1">
          <div className="sticky top-20">
            <Cart />
          </div>
        </div>
      </div>

      {/* Mobile: Menu + Basket */}
      <div className="md:hidden px-4 pb-20 sticky top-20">
        {categories.map((cat) => (
          <div
            key={cat.id}
            id={cat.name.toLowerCase()}
            ref={(el) => {
              sectionRefs.current[cat.id] = el;
              // ✅ No return
            }}
          >
            <CategorySection
              category={cat.name}
              dishes={cat.foods}
              expanded={expanded[cat.id]}
              onToggle={() => toggleCategory(cat.id)}
            />
          </div>
        ))}
      </div>

      {/* Mobile: Fixed Basket Button */}
      <button
        onClick={goToBasket}
        className="md:hidden fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 font-medium hover:bg-green-700 z-50"
      >
        🛒 Basket
        {basketItemCount > 0 && (
          <span className="bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
            {basketItemCount}
          </span>
        )}
      </button>

      {/* Mobile: Sticky Basket at Bottom */}
      <div id="basket-section" className="md:hidden bg-white border-t">
        <Cart />
      </div>
    </div>
  );
};

export default MenuPage;
