// app/components/cart/MenuPage.tsx
"use client";

import React, { useEffect, useState, useRef } from "react";
import MenuSidebar from "./MenuSidebar";
import Cart from "./Cart";
import CategorySection from "./CategorySection";
import { useBasketStore } from "@/app/store/basketStore";
import { MenuSkeleton } from "./MenuSkeleton";

const MenuPage = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [basketItemCount, setBasketItemCount] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [allExpanded, setAllExpanded] = useState(true);
  const [expanded, setExpanded] = useState<{ [key: number]: boolean }>({});
  const [activeCategoryId, setActiveCategoryId] = useState<number>(0);

  const tabContainerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Basket count
  useEffect(() => {
    const updateItemCount = () => {
      const basket = useBasketStore.getState().basketItems;
      setBasketItemCount(basket.length);
    };
    updateItemCount();
    const unsubscribe = useBasketStore.subscribe(updateItemCount);
    return () => unsubscribe();
  }, []);

  // Fetch menu
  useEffect(() => {
    setLoading(true);
    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/menu");
        if (!res.ok) throw new Error("Failed to load menu");
        const data = await res.json();
        setCategories(data);

        // Initialize expanded state - expand all by default
        const initialExpanded: { [key: number]: boolean } = {};
        data.forEach((cat: any) => {
          initialExpanded[cat.id] = true;
        });
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
          (cat) => cat.name.toLowerCase().replace(/\s+/g, "-") === hash
        );
        if (target) {
          setSelectedCategory(target.id);
          setActiveCategoryId(target.id);
        }
      }
    };

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [categories]);

  const handleCategorySelect = (id: number) => {
    const cat = categories.find((c) => c.id === id);
    if (cat) {
      const slug = cat.name.toLowerCase().replace(/\s+/g, "-");
      window.history.replaceState(null, "", `#${slug}`);
      setSelectedCategory(id);
    }
  };

  const handleBackToAll = () => {
    setSelectedCategory(null);
    window.history.replaceState(null, "", window.location.pathname);
  };

  const toggleAllCategories = () => {
    setAllExpanded(!allExpanded);
  };

  // Mobile: Toggle category and scroll
  const toggleCategory = (id: number) => {
    setActiveCategoryId(id);

    // Check if this category is currently expanded
    const isCurrentlyExpanded = expanded[id];

    // Create new expanded state
    const newExpanded: { [key: number]: boolean } = {};

    if (isCurrentlyExpanded) {
      // If already open, close it
      newExpanded[id] = false;
    } else {
      // Close all, open only this one
      categories.forEach((cat) => {
        newExpanded[cat.id] = cat.id === id;
      });
    }

    setExpanded(newExpanded);

    // Update URL
    const category = categories.find((cat) => cat.id === id);
    if (category) {
      const slug = category.name.toLowerCase().replace(/\s+/g, "-");
      window.history.replaceState(null, "", `#${slug}`);
    }

    // Scroll to category
    setTimeout(() => {
      const el = sectionRefs.current[id];
      if (el) {
        const offset = window.innerWidth < 768 ? 140 : 100;
        const y = el.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top: y, behavior: "smooth" });
      }
    }, 100);
  };
  const goToBasket = () => {
    const cartSection = document.getElementById("basket-section");
    cartSection?.scrollIntoView({ behavior: "smooth", block: "start" });
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

  const selectedCat = selectedCategory
    ? categories.find((cat) => cat.id === selectedCategory)
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile: Category Tabs */}
      <div
        ref={tabContainerRef}
        className="md:hidden bg-white border-b overflow-x-auto whitespace-nowrap sticky top-16 z-40 shadow-sm"
      >
        <div className="flex py-2 px-2 gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => toggleCategory(cat.id)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition flex-shrink-0 ${
                activeCategoryId === cat.id
                  ? "bg-blue-600 text-white shadow"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block">
        <div
          className="flex gap-6 p-6 max-w-7xl mx-auto"
          style={{ height: "calc(100vh - 80px)" }}
        >
          {/* Sidebar */}
          <div className="w-1/4 flex-shrink-0 overflow-y-auto">
            <MenuSidebar
              categories={categories}
              activeCategory={selectedCategory}
              onScrollTo={handleCategorySelect}
            />
          </div>

          {/* Main Content */}
          <div className="w-1/2 flex-shrink-0 flex flex-col">
            {selectedCategory !== null && selectedCat ? (
              <>
                <button
                  onClick={handleBackToAll}
                  className="w-fit text-blue-600 hover:text-blue-800 font-medium flex items-center mb-4"
                >
                  ← Back to All Categories
                </button>
                <CategorySection
                  category={selectedCat.name}
                  dishes={selectedCat.foods}
                  expanded={true}
                  onToggle={() => {}}
                />
              </>
            ) : (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">Menu</h2>
                  <button
                    onClick={toggleAllCategories}
                    className="text-sm text-gray-700 hover:text-orange-600 font-medium"
                  >
                    {allExpanded ? "Collapse All" : "Expand All"}
                  </button>
                </div>
                <div className="overflow-y-auto pr-2 flex-1">
                  {categories.map((cat) => (
                    <CategorySection
                      key={cat.id}
                      category={cat.name}
                      dishes={cat.foods}
                      expanded={allExpanded}
                      onToggle={() => {}}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Cart */}
          <div className="w-1/4 flex-shrink-0 overflow-y-auto">
            <Cart />
          </div>
        </div>
      </div>

      {/* Mobile View */}
      <div className="md:hidden px-4 pb-20 pt-4">
        {categories.map((cat) => (
          <div
            key={cat.id}
            id={cat.name.toLowerCase().replace(/\s+/g, "-")}
            ref={(el) => {
              sectionRefs.current[cat.id] = el;
            }}
            className="mb-4"
          >
            <CategorySection
              category={cat.name}
              dishes={cat.foods}
              expanded={!!expanded[cat.id]}
              onToggle={() => toggleCategory(cat.id)}
            />
          </div>
        ))}

        <div id="basket-section" className="bg-white border-t pt-4 mt-8">
          <Cart />
        </div>
      </div>

      {/* Mobile Basket Button */}
      <button
        onClick={goToBasket}
        className="md:hidden fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 font-medium hover:bg-green-700 z-50 transition-all"
      >
        🛒 Basket
        {basketItemCount > 0 && (
          <span className="bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">
            {basketItemCount}
          </span>
        )}
      </button>
    </div>
  );
};

export default MenuPage;
