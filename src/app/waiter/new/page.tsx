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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const menuContainerRef = useRef<HTMLDivElement>(null);
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

  // Form state
  const [form, setForm] = useState({
    deliveryType: "PICKUP" as "PICKUP" | "DINEIN",
    tableId: null as number | null,
    guestEmail: "",
    orderNote: "",
    promoCode: "",
  });

  // Payment state (Pickup only)
  const [payment, setPayment] = useState({
    method: "CARD" as "CARD" | "CASH",
    cashGiven: "",
  });

  // Dine-in unpaid tab
  const [isUnpaidTab, setIsUnpaidTab] = useState(false);

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

      const normalized = data.map((cat: any) => ({
        ...cat,
        foods: cat.foods.map((food: any) => ({
          ...food,
          price: parseFloat(food.price),
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

  const handleDeliveryTypeChange = (type: "PICKUP" | "DINEIN") => {
    setForm((prev) => ({
      ...prev,
      deliveryType: type,
      tableId: type === "DINEIN" ? prev.tableId : null,
    }));
    if (type === "PICKUP") {
      setPayment({ method: "CARD", cashGiven: "" });
      setIsUnpaidTab(false); // Pickup can't be unpaid
    } else {
      // Reset payment for dine-in
      setPayment({ method: "CARD", cashGiven: "" });
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

  const getReturnAmount = () => {
    if (payment.method !== "CASH" || !payment.cashGiven) return 0;
    const cash = parseFloat(payment.cashGiven);
    return cash - getTotal();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (form.deliveryType === "DINEIN" && !form.tableId) {
      setError("Please select a table for Dine-in");
      setIsSubmitting(false);
      return;
    }

    if (cart.length === 0) {
      setError("Add at least one item to the cart");
      setIsSubmitting(false);
      return;
    }

    // For Pickup: always paid
    // For Dine-in: paid unless "Save as unpaid tab" is checked
    const isPaid = form.deliveryType === "PICKUP" ? true : !isUnpaidTab;

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
        paymentMethod:
          form.deliveryType === "PICKUP"
            ? payment.method
            : isPaid
            ? "CARD"
            : null, // Dine-in unpaid has no payment method
        cashGiven:
          form.deliveryType === "PICKUP" && payment.method === "CASH"
            ? parseFloat(payment.cashGiven)
            : undefined,
        isPaid: isPaid,
        items,
      };

      let res;
      if (editingOrderId) {
        res = await fetch(`/api/waiter/order/${editingOrderId}`, {
          method: "PUT",
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
        if (session?.user.role === "WAITER")
          setTimeout(() => router.push("/waiter/orders"), 2000);
        if (session?.user.role === "ADMIN")
          setTimeout(() => router.push("/admin/orders"), 2000);
      } else {
        const err = await res.json();
        setError(err.error || "Failed to create/update order");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === "loading")
    return (
      <div className="p-6 text-center text-gray-600">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mr-3"></div>
        Loading...
      </div>
    );

  const total = getTotal();
  const isCashShort =
    payment.method === "CASH" &&
    payment.cashGiven &&
    parseFloat(payment.cashGiven) < total;

  // Get button text based on state
  const getSubmitButtonText = () => {
    if (isSubmitting) return "Saving...";
    if (editingOrderId) return "Update Order";
    if (cart.length === 0) return "Add Items to Cart";
    if (form.deliveryType === "PICKUP" && isCashShort)
      return "Insufficient Cash";
    if (isUnpaidTab) return "Save as Unpaid Tab";
    return "Place Order & Mark Paid";
  };

  // Get cart button text
  const getCartButtonText = () => {
    if (cart.length === 0) return "Empty Cart";
    if (form.deliveryType === "PICKUP" && isCashShort)
      return "Insufficient Cash";
    if (isUnpaidTab) return "Save as Unpaid Tab";
    return "Confirm & Pay";
  };

  return (
    <ProtectedRoute requiredRoles={["ADMIN", "WAITER", "KITCHEN"]}>
      <div className="p-4 max-w-8xl mx-auto bg-gray-50 min-h-screen font-sans antialiased">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: Form */}
          <div className="lg:w-1/5 space-y-6">
            {/* Order Header */}
            <div className="bg-white p-4 rounded-xl shadow-sm border">
              <h1 className="text-xl font-bold text-gray-800 text-center">
                {editingOrderId ? "Update Order" : "New Order"}
              </h1>
            </div>

            {/* Order Form */}
            <form
              onSubmit={handleSubmit}
              className="bg-white p-4 rounded-xl shadow-sm border space-y-4"
            >
              {/* Service Type */}
              <div>
                <label className="block font-bold text-sm text-gray-700 mb-2">
                  Service Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleDeliveryTypeChange("DINEIN")}
                    className={`py-3 text-sm rounded-lg font-bold transition ${
                      form.deliveryType === "DINEIN"
                        ? "bg-blue-600 text-white shadow-md"
                        : "bg-gray-200 hover:bg-gray-300 text-gray-800"
                    }`}
                  >
                    Dine-in
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeliveryTypeChange("PICKUP")}
                    className={`py-3 text-sm rounded-lg font-bold transition ${
                      form.deliveryType === "PICKUP"
                        ? "bg-green-600 text-white shadow-md"
                        : "bg-gray-200 hover:bg-gray-300 text-gray-800"
                    }`}
                  >
                    Pickup
                  </button>
                </div>
              </div>

              {/* Table Selection */}
              {form.deliveryType === "DINEIN" && (
                <div>
                  <label className="block font-bold text-sm text-gray-700 mb-1">
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
                <label className="block font-bold text-sm text-gray-700 mb-1">
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
                <label className="block font-bold text-sm text-gray-700 mb-1">
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
                <label className="block font-bold text-sm text-gray-700 mb-1">
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

              {/* Unpaid Tab Option (Dine-in only) */}
              {form.deliveryType === "DINEIN" && (
                <div className="pt-2 border-t">
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      id="unpaid-tab"
                      checked={isUnpaidTab}
                      onChange={(e) => setIsUnpaidTab(e.target.checked)}
                      className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label
                      htmlFor="unpaid-tab"
                      className="text-sm text-gray-700"
                    >
                      <span className="font-bold">Save as unpaid tab</span>
                      <p className="text-xs text-gray-500 mt-1">
                        Customer will pay later (order appears as unpaid in
                        dashboard)
                      </p>
                    </label>
                  </div>
                </div>
              )}

              {/* Payment Method (Pickup only) */}
              {form.deliveryType === "PICKUP" && (
                <div className="pt-2 border-t">
                  <label className="block font-bold text-sm text-gray-700 mb-2">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPayment({ ...payment, method: "CARD" })}
                      className={`py-3 text-sm rounded-lg font-bold transition ${
                        payment.method === "CARD"
                          ? "bg-blue-600 text-white shadow-md"
                          : "bg-gray-200 hover:bg-gray-300 text-gray-800"
                      }`}
                    >
                      Card
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayment({ ...payment, method: "CASH" })}
                      className={`py-3 text-sm rounded-lg font-bold transition ${
                        payment.method === "CASH"
                          ? "bg-green-600 text-white shadow-md"
                          : "bg-gray-200 hover:bg-gray-300 text-gray-800"
                      }`}
                    >
                      Cash
                    </button>
                  </div>

                  {payment.method === "CASH" && (
                    <div className="mt-3">
                      <label className="block text-sm text-gray-600 mb-1">
                        Cash Given (£)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={payment.cashGiven}
                        onChange={(e) =>
                          setPayment({ ...payment, cashGiven: e.target.value })
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="e.g. 20.00"
                      />
                      {payment.cashGiven && (
                        <div
                          className={`mt-2 p-2 rounded font-bold ${
                            isCashShort
                              ? "bg-red-100 text-red-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {isCashShort
                            ? `Short: £${Math.abs(getReturnAmount()).toFixed(
                                2
                              )}`
                            : `Return: £${getReturnAmount().toFixed(2)}`}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={
                  cart.length === 0 ||
                  (form.deliveryType === "PICKUP" && isCashShort) ||
                  isSubmitting
                }
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3.5 rounded-lg text-base font-bold hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md mt-2 flex items-center justify-center"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                    Saving...
                  </>
                ) : (
                  getSubmitButtonText()
                )}
              </button>
            </form>
          </div>

          {/* Right: Menu */}
          <div className="lg:w-3/5 bg-white p-4 rounded-xl shadow-sm border flex flex-col">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Menu</h2>

            {/* Loading State */}
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600 mb-4"></div>
                <p className="text-gray-600 text-lg">Loading menu...</p>
              </div>
            ) : categories.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-gray-500">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-16 w-16 mb-4 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                <p className="text-lg">No menu items available</p>
              </div>
            ) : (
              <>
                {/* Category Tabs */}
                <div className="flex gap-2 mb-4 overflow-x-auto pb-2 hide-scrollbar">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setActiveCategory(cat.id);
                        setExpanded({ ...expanded, [cat.id]: true });
                        setTimeout(() => {
                          const el = sectionRefs.current[cat.id];
                          if (el && menuContainerRef.current) {
                            const containerRect =
                              menuContainerRef.current.getBoundingClientRect();
                            const elRect = el.getBoundingClientRect();
                            const scrollTop =
                              menuContainerRef.current.scrollTop +
                              elRect.top -
                              containerRect.top -
                              20;
                            menuContainerRef.current.scrollTo({
                              top: scrollTop,
                              behavior: "smooth",
                            });
                          }
                        }, 50);
                      }}
                      className={`px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap flex-shrink-0 ${
                        activeCategory === cat.id
                          ? "bg-blue-600 text-white shadow-md"
                          : "bg-gray-200 hover:bg-gray-300 text-gray-800"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                {/* Scrollable Menu */}
                <div
                  ref={menuContainerRef}
                  className="flex-1 overflow-y-auto pr-2 max-h-[70vh] hide-scrollbar"
                >
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      ref={(el) => {
                        sectionRefs.current[cat.id] = el;
                      }}
                      className="mb-6"
                    >
                      <div
                        className="font-bold text-lg flex justify-between items-center cursor-pointer py-2"
                        onClick={() =>
                          setExpanded({
                            ...expanded,
                            [cat.id]: !expanded[cat.id],
                          })
                        }
                      >
                        {cat.name}
                        <span className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded-full text-gray-700">
                          {expanded[cat.id] ? "−" : "+"}
                        </span>
                      </div>

                      {expanded[cat.id] && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                          {cat.foods
                            .filter((f) => f.available)
                            .map((food) => (
                              <div
                                key={food.id}
                                className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow bg-white"
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <h4 className="font-bold text-gray-900 text-base">
                                      {food.name}
                                    </h4>
                                    {food.description && (
                                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                        {food.description}
                                      </p>
                                    )}
                                  </div>
                                  <span className="font-bold text-lg text-green-700">
                                    £{food.price}
                                  </span>
                                </div>

                                {food.options.length === 0 ? (
                                  <button
                                    onClick={() => addToCart(food)}
                                    className="mt-3 w-full bg-blue-600 text-white py-3 rounded-lg text-base font-bold hover:bg-blue-700 transition"
                                  >
                                    + Add
                                  </button>
                                ) : (
                                  <div className="mt-3 grid grid-cols-1 gap-2">
                                    {food.options.map((opt) => (
                                      <button
                                        key={opt.id}
                                        onClick={() => addToCart(food, opt.id)}
                                        className="w-full bg-green-600 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-green-700 transition"
                                      >
                                        {opt.name} (+£{opt.price})
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Cart Summary */}
          <div className="bg-white lg:w-1/5 p-4 rounded-xl shadow-sm border sticky top-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-xl font-bold text-gray-800">Cart</h2>
              <span className="bg-blue-100 text-blue-800 text-sm font-bold px-2 py-1 rounded-full">
                {cart.length} item{cart.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto mb-4 pr-1">
              {cart.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
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
                      className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border"
                    >
                      <div className="flex-1 mr-2">
                        <div className="font-bold text-sm text-gray-800">
                          {item.quantity}x {item.food.name}
                        </div>
                        {option && (
                          <div className="text-xs text-blue-600">
                            + {option.name}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-700 text-sm">
                          £{(price * item.quantity).toFixed(2)}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <button
                            onClick={() =>
                              updateQuantity(item.food.id, item.optionId, -1)
                            }
                            className="w-7 h-7 bg-red-500 text-white rounded-full text-sm hover:bg-red-600 flex items-center justify-center"
                          >
                            −
                          </button>
                          <span className="w-6 text-center text-sm font-medium">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(item.food.id, item.optionId, 1)
                            }
                            className="w-7 h-7 bg-green-500 text-white rounded-full text-sm hover:bg-green-600 flex items-center justify-center"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t pt-3">
              <div className="flex justify-between font-bold text-lg text-gray-800 mb-3">
                Total: <span>£{total.toFixed(2)}</span>
              </div>
              <button
                onClick={handleSubmit}
                disabled={
                  cart.length === 0 ||
                  (form.deliveryType === "PICKUP" && isCashShort) ||
                  isSubmitting
                }
                className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 rounded-lg font-bold hover:from-green-700 hover:to-green-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                    Saving...
                  </>
                ) : (
                  getCartButtonText()
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Toast Notifications */}
        {error && (
          <div className="fixed top-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in">
            {error}
            <button
              onClick={() => setError(null)}
              className="absolute top-2 right-2 text-white hover:text-gray-200"
            >
              ×
            </button>
          </div>
        )}

        {success && (
          <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in">
            ✅ Order {editingOrderId ? "updated" : "created"}! Redirecting...
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
