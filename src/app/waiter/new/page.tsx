// app/waiter/orders/new/page.tsx
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

export default function CreateWaiterOrder() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const sectionRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  const [tables, setTables] = useState<
    { id: number; number: string; status: string }[]
  >([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<{ [key: number]: boolean }>({});

  // Form state
  const [form, setForm] = useState({
    deliveryType: "PICKUP" as "PICKUP" | "DINEIN",
    tableId: null as number | null,
    guestName: "",
    guestEmail: "",
    orderNote: "",
    promoCode: "",
  });

  // Cart
  const [cart, setCart] = useState<
    { food: Food; quantity: number; optionId: number | null }[]
  >([]);

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
      setTables(data.tables.filter((t: any) => t.status !== "RESERVED"));
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
      setCategories(data);

      if (data.length > 0) {
        const firstCat = data[0];
        setActiveCategory(firstCat.id);
        setExpanded({ [firstCat.id]: true });
      }
    } catch (err: any) {
      setError("Failed to load menu: " + err.message);
    } finally {
      setLoading(false);
    }
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
    if (!form.guestName.trim()) {
      setError("Guest name is required");
      return;
    }
    if (form.deliveryType === "DINEIN" && !form.tableId) {
      setError("Please select a table for Dine-in");
      return;
    }

    const items = cart.map((item) => ({
      foodId: item.food.id,
      quantity: item.quantity,
      foodOptionId: item.optionId,
    }));

    try {
      const res = await fetch("/api/waiter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          items,
          promoCode: form.promoCode || undefined,
        }),
      });

      if (res.ok) {
        const order = await res.json();
        setSuccess(true);
        setCart([]);
        setTimeout(() => router.push("/waiter"), 2000);
      } else {
        const err = await res.json();
        setError(err.error || "Failed to create order");
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (status === "loading" || loading)
    return <div className="p-6 text-center">Loading menu...</div>;

  return (
    <ProtectedRoute requiredRoles={["ADMIN", "WAITER"]}>
      {" "}
      <div className="p-4 max-w-7xl mx-auto bg-gray-50 min-h-screen">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: Form */}
          <div className="lg:w-1/3 space-y-6">
            {/* Header */}
            <div className="bg-white p-4 rounded-lg shadow">
              <h1 className="text-2xl font-bold text-center text-gray-800">
                Order Entry
              </h1>
            </div>

            {/* Guest & Table Info */}
            <div className="bg-white p-5 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-4 border-b pb-2">
                Order Details
              </h2>

              <div className="space-y-4">
                {/* Order Type */}
                <div>
                  <label className="block font-medium text-sm">
                    Order Type
                  </label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          deliveryType: "DINEIN",
                          tableId: form.tableId || tables[0]?.id || null,
                        })
                      }
                      className={`py-2 text-sm rounded ${
                        form.deliveryType === "DINEIN"
                          ? "bg-green-600 text-white"
                          : "bg-gray-100 hover:bg-gray-200"
                      }`}
                    >
                      Dine-in
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          deliveryType: "PICKUP",
                          tableId: null,
                        })
                      }
                      className={`py-2 text-sm rounded ${
                        form.deliveryType === "PICKUP"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 hover:bg-gray-200"
                      }`}
                    >
                      Pickup
                    </button>
                  </div>
                </div>

                {/* Table (Dine-in only) */}
                {form.deliveryType === "DINEIN" && (
                  <div>
                    <label className="block font-medium text-sm">Table</label>
                    <select
                      value={form.tableId || ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          tableId: Number(e.target.value) || null,
                        })
                      }
                      className="w-full border px-3 py-2 rounded text-sm mt-1"
                    >
                      <option value="">Select Table</option>
                      {tables.map((table) => (
                        <option key={table.id} value={table.id}>
                          Table {table.number} ({table.status})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Guest Name */}
                <div>
                  <label className="block font-medium text-sm">
                    Guest Name *
                  </label>
                  <input
                    type="text"
                    value={form.guestName}
                    onChange={(e) =>
                      setForm({ ...form, guestName: e.target.value })
                    }
                    className="w-full border px-3 py-2 rounded text-sm mt-1"
                    placeholder="John Doe"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block font-medium text-sm">
                    Guest Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={form.guestEmail}
                    onChange={(e) =>
                      setForm({ ...form, guestEmail: e.target.value })
                    }
                    className="w-full border px-3 py-2 rounded text-sm"
                    placeholder="johndoe@email.com"
                  />
                </div>

                {/* Promo Code */}
                <div>
                  <label className="block font-medium text-sm">
                    Promo Code
                  </label>
                  <input
                    type="text"
                    value={form.promoCode}
                    onChange={(e) =>
                      setForm({ ...form, promoCode: e.target.value })
                    }
                    className="w-full border px-3 py-2 rounded text-sm mt-1"
                    placeholder="WELCOME10"
                  />
                </div>

                {/* Order Note */}
                <div>
                  <label className="block font-medium text-sm">
                    Special Instructions
                  </label>
                  <textarea
                    value={form.orderNote}
                    onChange={(e) =>
                      setForm({ ...form, orderNote: e.target.value })
                    }
                    className="w-full border px-3 py-2 rounded text-sm mt-1"
                    rows={2}
                    placeholder="No onions, extra sauce"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Middle: Menu */}
          <div className="lg:w-1/2 bg-white p-5 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Menu</h2>

            {/* Category Tabs */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
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
                  className={`px-4 py-2 rounded-full text-sm whitespace-nowrap font-medium transition ${
                    activeCategory === cat.id
                      ? "bg-blue-600 text-white shadow"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Foods */}
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {categories.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No menu items available.
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
                      <span className="text-gray-500">
                        {expanded[cat.id] ? "−" : "+"}
                      </span>
                    </h3>

                    {expanded[cat.id] && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                        {cat.foods.map((food) => (
                          <div
                            key={food.id}
                            className="border rounded-lg p-3 hover:shadow-md transition relative"
                          >
                            <div className="flex justify-between mb-1">
                              <h4 className="font-medium">{food.name}</h4>
                              <span className="font-bold text-green-600">
                                £{food.price.toFixed(2)}
                              </span>
                            </div>
                            {food.description && (
                              <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                                {food.description}
                              </p>
                            )}

                            {/* Options */}
                            {food.options.length > 0 && (
                              <div className="text-xs text-blue-600 mb-2">
                                + Options available
                              </div>
                            )}

                            <div className="flex gap-2">
                              <button
                                onClick={() => addToCart(food)}
                                className="flex-1 bg-blue-600 text-white py-1 rounded text-sm hover:bg-blue-700"
                              >
                                Add
                              </button>
                              {food.options.length > 0 && (
                                <div className="relative group">
                                  <button className="px-2 py-1 bg-gray-200 rounded text-sm hover:bg-gray-300">
                                    ⚙️
                                  </button>
                                  <div className="absolute left-0 mt-1 w-48 bg-white border rounded shadow-lg p-2 text-xs z-10 hidden group-hover:block">
                                    {food.options.map((opt) => (
                                      <div
                                        key={opt.id}
                                        className="flex justify-between py-1 border-b"
                                      >
                                        <span>{opt.name}</span>
                                        <button
                                          onClick={() =>
                                            addToCart(food, opt.id)
                                          }
                                          className="text-green-600 hover:underline ml-2"
                                        >
                                          +£{opt.price.toFixed(2)}
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
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
            <div className="bg-white p-5 rounded-lg shadow sticky top-4">
              <h2 className="text-xl font-semibold mb-4">
                Cart ({cart.length})
              </h2>

              <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
                {cart.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    Add items from menu
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
                        className="flex items-center justify-between border p-2 rounded bg-gray-50"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-sm">
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
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            onClick={() =>
                              updateQuantity(item.food.id, item.optionId, -1)
                            }
                            className="w-6 h-6 bg-red-500 text-white rounded text-xs"
                          >
                            −
                          </button>
                          <span className="w-6 text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(item.food.id, item.optionId, 1)
                            }
                            className="w-6 h-6 bg-green-500 text-white rounded text-xs"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="border-t pt-3">
                <div className="flex justify-between font-bold text-lg mb-3">
                  Total: £{getTotal().toFixed(2)}
                </div>
                <button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={cart.length === 0}
                  className="w-full bg-green-600 text-white py-3 rounded-lg text-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                >
                  {cart.length === 0 ? "No Items" : "Place Order"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Error Toast */}
        {error && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-bounce">
            {error}
          </div>
        )}

        {/* Success Toast */}
        {success && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50">
            ✅ Order created! Redirecting...
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
