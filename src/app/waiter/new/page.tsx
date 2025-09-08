"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/Admin/ProtectedRoute";

type FoodOption = {
  id: number;
  name: string;
  price: number;
};

type Food = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  available: boolean;
  options: FoodOption[];
};

type Category = {
  id: number;
  name: string;
  image: string | null;
  foods: Food[];
};
type TableStatus = "AVAILABLE" | "OCCUPIED" | "RESERVED" | "UNAVAILABLE";

export default function CreateWaiterOrder() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const sectionRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  const [tables, setTables] = useState<
    Array<{
      id: number;
      number: string;
      status: TableStatus;
      currentOrderId: number | null;
    }>
  >([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<{ [key: number]: boolean }>({});
  // Track which food's options are expanded
  const [expandedOptions, setExpandedOptions] = useState<{
    [foodId: number]: boolean;
  }>({});

  // Track selected option per food
  const [selectedOptions, setSelectedOptions] = useState<{
    [foodId: number]: number;
  }>({});

  // Form state
  const [form, setForm] = useState({
    deliveryType: "PICKUP" as "PICKUP" | "DINEIN",
    tableId: null as number | null,
    guestEmail: "",
    orderNote: "",
    promoCode: "",
  });

  // Cart
  const [cart, setCart] = useState<
    { food: Food; quantity: number; optionId: number | null }[]
  >([]);

  // Editing existing order?
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);

  // Redirect if not allowed
  useEffect(() => {
    if (status === "loading") return;
    if (
      !session ||
      !["ADMIN", "WAITER", "KITCHEN"].includes(session.user.role)
    ) {
      router.push("/");
    } else {
      fetchTables();
      fetchMenu();
    }
  }, [session, status, router]);

  const fetchTables = async () => {
    try {
      const res = await fetch("/api/admin/tables");
      if (!res.ok) throw new Error("Failed to fetch tables");
      const data = await res.json();
      setTables(
        data.tables.filter(
          (t: any) => t.status === "AVAILABLE" || t.status === "OCCUPIED"
        )
      );
    } catch (err) {
      console.error("Failed to fetch tables:", err);
      setError("Could not load tables");
    }
  };

  const fetchMenu = async () => {
    try {
      const res = await fetch("/api/menu");
      if (!res.ok) throw new Error("Failed to fetch menu");
      const data = await res.json();

      // ✅ Normalize prices to numbers
      const normalized = data.map((cat: any) => ({
        ...cat,
        foods: cat.foods.map((food: any) => ({
          ...food,
          price: parseFloat(food.price), // Ensure number
          options: food.options.map((opt: any) => ({
            ...opt,
            price: parseFloat(opt.price),
          })),
        })),
      }));

      setCategories(normalized);

      if (normalized.length > 0) {
        const firstCat = normalized[0];
        setActiveCategory(firstCat.id);
        setExpanded({ [firstCat.id]: true });
      }
    } catch (err: any) {
      setError("Failed to load menu: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto-select first available table on DINEIN switch
  const handleDeliveryTypeChange = (type: "PICKUP" | "DINEIN") => {
    setForm((prev) => ({
      ...prev,
      deliveryType: type,
      tableId: type === "DINEIN" ? prev.tableId : null, // ✅ Only clear if switching to PICKUP
    }));
  };

  const addToCart = (food: Food, optionId: number | null = null) => {
    setCart((prev) => {
      const existing = prev.find(
        (i) => i.food.id === food.id && i.optionId === optionId
      );
      if (existing) {
        return prev.map((i) =>
          i.food.id === food.id && i.optionId === optionId
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, { food, quantity: 1, optionId }];
    });
  };

  const updateQuantity = (
    foodId: number,
    optionId: number | null,
    delta: number
  ) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.food.id === foodId && item.optionId === optionId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter((i): i is NonNullable<typeof i> => i !== null)
    );
  };

  const getTotal = () => {
    return cart.reduce((sum, item) => {
      const price =
        item.food.price +
        (item.optionId
          ? item.food.options.find((o) => o.id === item.optionId)?.price || 0
          : 0);
      return sum + price * item.quantity;
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.deliveryType === "DINEIN" && !form.tableId) {
      setError("Please select a table for Dine-in");
      return;
    }

    if (cart.length === 0) {
      setError("Add at least one item to the cart");
      return;
    }

    const items = cart.map((item) => ({
      foodId: item.food.id,
      quantity: item.quantity,
      foodOptionId: item.optionId || undefined,
      notes: undefined,
    }));

    try {
      const payload = {
        deliveryType: form.deliveryType,
        tableId: form.deliveryType === "DINEIN" ? form.tableId : undefined,
        email: form.guestEmail || undefined,
        orderNote: form.orderNote || undefined,
        promoCode: form.promoCode || undefined,
        items,
      };

      let res;
      if (editingOrderId) {
        res = await fetch(`/api/waiter/order/${editingOrderId}/add-items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/waiter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        const order = await res.json();
        setSuccess(true);
        setCart([]);
        setTimeout(() => router.push("/waiter/orders"), 2000);
      } else {
        const err = await res.json();
        setError(err.error || "Failed to create/update order");
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (status === "loading")
    return (
      <div className="p-6 text-center text-gray-600">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mr-3"></div>
        Loading menu...
      </div>
    );

  return (
    <ProtectedRoute requiredRoles={["ADMIN", "WAITER", "KITCHEN"]}>
      <div className="p-6 max-w-7xl mx-auto bg-gray-50 min-h-screen font-sans antialiased">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: Form */}
          <div className="lg:w-1/3 space-y-6">
            <div className="bg-white p-5 rounded-xl shadow-sm border">
              <h1 className="text-2xl font-semibold text-gray-800 text-center">
                {editingOrderId ? "Update Order" : "New Order"}
              </h1>
              {editingOrderId && (
                <p className="text-sm text-center text-blue-600 mt-1">
                  Editing existing order on Table {form.tableId}
                </p>
              )}
            </div>

            <form
              onSubmit={handleSubmit}
              className="bg-white p-5 rounded-xl shadow-sm border space-y-5"
            >
              {/* Order Type */}
              <div>
                <label className="block font-medium text-sm text-gray-700 mb-2">
                  Service Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleDeliveryTypeChange("DINEIN")}
                    className={`py-2.5 text-sm rounded-lg font-medium transition ${
                      form.deliveryType === "DINEIN"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                    }`}
                  >
                    Dine-in
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeliveryTypeChange("PICKUP")}
                    className={`py-2.5 text-sm rounded-lg font-medium transition ${
                      form.deliveryType === "PICKUP"
                        ? "bg-green-600 text-white shadow-sm"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                    }`}
                  >
                    Pickup
                  </button>
                </div>
              </div>

              {/* Table Selection (Dine-in only) */}
              {form.deliveryType === "DINEIN" && (
                <div>
                  <label className="block font-medium text-sm text-gray-700 mb-1">
                    Table
                  </label>
                  <select
                    value={form.tableId || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        tableId: Number(e.target.value) || null,
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a table</option>
                    {tables
                      .filter(
                        (t) =>
                          t.status === "AVAILABLE" || t.status === "OCCUPIED"
                      )
                      .map((table) => (
                        <option key={table.id} value={table.id}>
                          Table {table.number} • {table.status.toLowerCase()}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Guest Email */}
              <div>
                <label className="block font-medium text-sm text-gray-700 mb-1">
                  Guest Email (Optional)
                </label>
                <input
                  type="email"
                  value={form.guestEmail}
                  onChange={(e) =>
                    setForm({ ...form, guestEmail: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="guest@example.com"
                />
              </div>

              {/* Promo Code */}
              <div>
                <label className="block font-medium text-sm text-gray-700 mb-1">
                  Promo Code
                </label>
                <input
                  type="text"
                  value={form.promoCode}
                  onChange={(e) =>
                    setForm({ ...form, promoCode: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="WELCOME10"
                />
              </div>

              {/* Order Note */}
              <div>
                <label className="block font-medium text-sm text-gray-700 mb-1">
                  Special Instructions
                </label>
                <textarea
                  value={form.orderNote}
                  onChange={(e) =>
                    setForm({ ...form, orderNote: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={2}
                  placeholder="No onions, extra sauce"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={cart.length === 0}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg text-base font-medium hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm mt-4"
              >
                {editingOrderId
                  ? "Update Order"
                  : cart.length === 0
                  ? "No Items"
                  : "Place Order"}
              </button>
            </form>
          </div>

          {/* Middle: Menu */}
          <div className="lg:w-1/2 bg-white p-5 rounded-xl shadow-sm border">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Menu</h2>

            {/* Category Tabs */}
            <div className="flex gap-3 mb-5 overflow-x-auto pb-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setExpanded({ ...expanded, [cat.id]: true });
                    sectionRefs.current[cat.id]?.scrollIntoView({
                      behavior: "smooth",
                    });
                  }}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                    activeCategory === cat.id
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Foods */}
            <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-2">
              {categories.length === 0 ? (
                <p className="text-gray-500 text-center py-10">
                  No items available.
                </p>
              ) : (
                categories.map((cat) => (
                  <div
                    key={cat.id}
                    ref={(el) => {
                      sectionRefs.current[cat.id] = el;
                    }}
                    className="scroll-mt-20"
                  >
                    <h3
                      className="font-bold text-lg flex justify-between items-center cursor-pointer"
                      onClick={() =>
                        setExpanded({
                          ...expanded,
                          [cat.id]: !expanded[cat.id],
                        })
                      }
                    >
                      {cat.name}
                      <span>{expanded[cat.id] ? "−" : "+"}</span>
                    </h3>

                    {expanded[cat.id] && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                        {cat.foods
                          .filter((f) => f.available)
                          .map((food) => (
                            <div
                              key={food.id}
                              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                            >
                              <div className="flex justify-between mb-1">
                                <h4 className="font-medium text-gray-800">
                                  {food.name}
                                </h4>
                                <span className="font-bold text-green-600">
                                  £{food.price}
                                </span>
                              </div>
                              {food.description && (
                                <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                                  {food.description}
                                </p>
                              )}
                              {/* Options Indicator */}
                              {food.options.length > 0 && (
                                <p className="text-xs text-blue-600 mb-3">
                                  + Customizable
                                </p>
                              )}
                              <div className="border border-gray-200 rounded-lg p-4">
                                {/* If no options */}
                                {food.options.length === 0 ? (
                                  <button
                                    onClick={() => addToCart(food)}
                                    className="w-full bg-blue-600 text-white py-2 rounded text-sm hover:bg-blue-700 transition"
                                  >
                                    Add
                                  </button>
                                ) : (
                                  // If options exist → show buttons
                                  <div className="space-y-1">
                                    {food.options.map((opt) => (
                                      <button
                                        key={opt.id}
                                        onClick={() => addToCart(food, opt.id)}
                                        className="w-full bg-green-600 text-white py-1.5 text-sm rounded hover:bg-green-700 transition"
                                      >
                                        {opt.name} (+£{opt.price})
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                              {/* Expandable Options Panel */}
                              {expandedOptions[food.id] &&
                                food.options.length > 0 && (
                                  <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
                                    <p className="text-xs font-medium text-gray-700">
                                      Customizations:
                                    </p>
                                    <div className="grid grid-cols-1 gap-1.5">
                                      {food.options.map((opt) => {
                                        const isSelected =
                                          selectedOptions[food.id] === opt.id;
                                        return (
                                          <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => {
                                              // Toggle: click again to deselect
                                              if (
                                                selectedOptions[food.id] ===
                                                opt.id
                                              ) {
                                                setSelectedOptions((prev) => {
                                                  const {
                                                    [food.id]: _,
                                                    ...rest
                                                  } = prev;
                                                  return rest;
                                                });
                                              } else {
                                                setSelectedOptions((prev) => ({
                                                  ...prev,
                                                  [food.id]: opt.id,
                                                }));
                                              }
                                            }}
                                            className={`flex justify-between items-center px-3 py-1.5 text-xs rounded border transition-all ${
                                              isSelected
                                                ? "bg-blue-600 text-white border-blue-600"
                                                : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
                                            }`}
                                          >
                                            <span>{opt.name}</span>
                                            <span>+£{opt.price}</span>
                                          </button>
                                        );
                                      })}
                                    </div>

                                    {/* Add to Cart with Selected Option */}
                                    <button
                                      onClick={() => {
                                        const optionId =
                                          selectedOptions[food.id] || null;
                                        addToCart(food, optionId);
                                        // Optional: collapse after adding
                                        setExpandedOptions((prev) => ({
                                          ...prev,
                                          [food.id]: false,
                                        }));
                                      }}
                                      className="w-full mt-2 bg-green-600 hover:bg-green-700 text-white text-sm py-1.5 rounded transition"
                                    >
                                      Add{" "}
                                      {selectedOptions[food.id]
                                        ? " with Option"
                                        : ""}
                                    </button>
                                  </div>
                                )}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: Cart */}
          <div className="lg:w-1/4">
            <div className="bg-white p-5 rounded-xl shadow-sm border sticky top-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Cart ({cart.length})
              </h2>

              <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
                {cart.length === 0 ? (
                  <p className="text-gray-500 text-center py-6">
                    Add items from the menu
                  </p>
                ) : (
                  cart.map((item) => {
                    const option = item.optionId
                      ? item.food.options.find((o) => o.id === item.optionId)
                      : null;
                    const price = item.food.price + (option?.price || 0);

                    return (
                      <div
                        key={`cart-${item.food.id}-${item.optionId}`}
                        className="flex items-start justify-between p-3 bg-gray-50 rounded-lg border"
                      >
                        <div className="flex-1 mr-2">
                          <div className="font-medium text-sm text-gray-800">
                            {item.quantity}x {item.food.name}
                          </div>
                          {option && (
                            <div className="text-xs text-blue-600">
                              + {option.name}
                            </div>
                          )}
                          <div className="text-green-600 font-bold text-sm">
                            £{(price * item.quantity).toFixed(2)}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-1">
                          <button
                            onClick={() =>
                              updateQuantity(item.food.id, item.optionId, -1)
                            }
                            className="w-7 h-7 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                          >
                            −
                          </button>
                          <span className="w-6 text-center text-sm">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(item.food.id, item.optionId, 1)
                            }
                            className="w-7 h-7 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between font-bold text-lg text-gray-800 mb-4">
                  Total: £{getTotal().toFixed(2)}
                </div>
                <button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={cart.length === 0}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-lg font-medium hover:from-green-600 hover:to-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                >
                  {cart.length === 0
                    ? "Empty Cart"
                    : editingOrderId
                    ? "Update Order"
                    : "Place Order"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Toast Notifications */}
        {error && (
          <div className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-full shadow-lg z-50 animate-fade-in">
            {error}
          </div>
        )}

        {success && (
          <div className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-8 py-3 rounded-full shadow-lg z-50 animate-fade-in">
            ✅ Order {editingOrderId ? "updated" : "created"}! Redirecting...
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
