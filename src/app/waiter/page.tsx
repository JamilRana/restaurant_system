"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Pusher from "pusher-js";
import SearchBar from "@/components/Admin/SearchBar";
import DateRangePicker from "@/components/DateRangePicker";
import Pagination from "@/components/Pagination";
import ProtectedRoute from "@/components/Admin/ProtectedRoute";
import { RouteLoader } from "@/components/RouteLoader";

type FoodOption = { id: number; name: string; price: number };
type Food = { id: number; name: string; price: number; options: FoodOption[] };
type OrderItem = {
  id: number;
  quantity: number;
  price: number;
  foodOptionId: number | null;
  notes: string | null;
  food: Food | null;
};
type Customer = { id: number; name: string | null; email: string | null };
type Order = {
  id: number;
  status: "ACCEPTED" | "PREPARING" | "READY" | "DELIVERED" | "REJECTED";
  totalAmount: number;
  finalAmount: number;
  deliveryType: "DINEIN" | "PICKUP";
  currentTableFor: { number: string } | null;
  items: OrderItem[];
  createdAt: string;
  customer: Customer | null;
  createdById: number | null; // ✅ Added
};

export default function WaiterDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [foods, setFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"today" | "all">("today");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [totalOrdersCount, setTotalOrdersCount] = useState(0);

  // ✅ Only show today's count, not affected by date filter
  const [todayCount, setTodayCount] = useState(0);

  const today = new Date();
  const [dateRange, setDateRange] = useState<{
    startDate: Date | null;
    endDate: Date | null;
  }>({
    startDate: null,
    endDate: null,
  });

  const fetchOrders = async () => {
    setLoading(true);
    try {
      let url = `/api/waiter/orders?page=${page}&limit=10`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      // Only apply date filter in "All" tab
      if (activeTab === "all") {
        if (dateRange.startDate) {
          const start = new Date(dateRange.startDate);
          url += `&startDate=${start.toISOString()}`;
        }
        if (dateRange.endDate) {
          const end = new Date(dateRange.endDate);
          end.setHours(23, 59, 59, 999);
          url += `&endDate=${end.toISOString()}`;
        }
      } else {
        // "Today" tab: auto-filter today
        const start = new Date(today);
        start.setHours(0, 0, 0, 0);
        const end = new Date(today);
        end.setHours(23, 59, 59, 999);
        url += `&startDate=${start.toISOString()}&endDate=${end.toISOString()}`;
      }

      // ✅ Filter only orders created by this staff
      const staffId = session?.user.id;
      if (staffId) {
        url += `&createdById=${staffId}`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();

      setOrders(data.orders);
      setTotalPages(data.totalPages);
      setTotalOrdersCount(data.totalCount);

      // ✅ Always fetch today's count separately
      const todayRes = await fetch(
        `/api/waiter/orders?limit=1&createdById=${staffId}&startDate=${new Date(
          today.setHours(0, 0, 0, 0)
        ).toISOString()}&endDate=${new Date(
          today.setHours(23, 59, 59, 999)
        ).toISOString()}`
      );
      const todayData = await todayRes.json();
      setTodayCount(todayData.totalCount || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFoods = async () => {
    try {
      const res = await fetch("/api/menu");
      const data = await res.json();
      const allFoods = data.flatMap((cat: any) => cat.foods);
      setFoods(allFoods);
    } catch (err) {
      console.error("Failed to load foods:", err);
    }
  };

  const resetFilters = () => {
    setSearch("");
    setPage(1);
    if (activeTab === "all") {
      setDateRange({ startDate: null, endDate: null });
    }
  };

  useEffect(() => {
    if (status === "loading" || !session) return;

    if (!["ADMIN", "WAITER", "KITCHEN"].includes(session.user.role)) {
      router.push("/auth");
      return;
    }

    fetchOrders();
    fetchFoods();

    if (typeof window !== "undefined") {
      const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        forceTLS: true,
      });

      const channelName = `restaurant-${session.user.restaurantId}`;
      const channel = pusher.subscribe(channelName);

      channel.bind("order-updated", (updatedOrder: Order) => {
        setOrders((prev) =>
          prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
        );
      });

      channel.bind("order-created", (newOrder: Order) => {
        if (newOrder.createdById === session.user.id) {
          setOrders((prev) => [newOrder, ...prev]);
          setTodayCount((c) => c + 1);
        }
      });

      return () => {
        channel.unbind_all();
        channel.unsubscribe();
        pusher.disconnect();
      };
    }
  }, [session, status, router]);

  useEffect(() => {
    fetchOrders();
  }, [page, search, activeTab, dateRange]);

  if (status === "loading") return <RouteLoader />;

  return (
    <ProtectedRoute requiredRoles={["ADMIN", "WAITER"]}>
      <div className="p-4 md:p-6 max-w-7xl mx-auto bg-gray-50 min-h-screen font-sans antialiased">
        <h1 className="text-3xl font-semibold mb-6 text-center text-gray-800">
          Waiter Dashboard
        </h1>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-2 gap-4 mb-6">
          <StatBox label="Today's Orders" value={todayCount} color="blue" />
          <StatBox label="Total Orders" value={totalOrdersCount} color="gray" />
        </div>

        {/* Tabs */}
        <div className="flex border-b mb-6 overflow-x-auto">
          {[
            { key: "today", label: "Today's Orders" },
            { key: "all", label: "Order History" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key as "today" | "all");
                setPage(1);
              }}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition whitespace-nowrap ${
                activeTab === tab.key
                  ? "border-blue-600 text-blue-700 bg-blue-50"
                  : "border-transparent text-gray-600 hover:text-gray-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white p-5 rounded-xl shadow-sm mb-6 space-y-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-48">
              <SearchBar
                onSearch={setSearch}
                placeholder="Search by name, email, order #..."
              />
            </div>
            {activeTab === "all" && (
              <DateRangePicker value={dateRange} onChange={setDateRange} />
            )}
            <button
              onClick={resetFilters}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 underline"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Orders Grid */}
        {orders.length === 0 ? (
          <p className="text-gray-500 text-center py-12 text-lg">
            No orders found.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                foods={foods}
                onUpdate={setOrders}
                isToday={activeTab === "today"}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-8">
            <Pagination
              page={page}
              total={totalPages * 10}
              limit={10}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

// Reusable Stat Box
function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-800",
    gray: "bg-gray-50 text-gray-800",
  };
  return (
    <div
      className={`p-4 rounded-lg border text-center ${
        colors[color as keyof typeof colors]
      }`}
    >
      <h3 className="text-sm font-medium text-gray-600">{label}</h3>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}

// OrderCard
function OrderCard({
  order,
  foods,
  onUpdate,
  isToday,
}: {
  order: Order;
  foods: Food[];
  onUpdate: React.Dispatch<React.SetStateAction<Order[]>>;
  isToday: boolean;
}) {
  const [showAddItem, setShowAddItem] = useState(false);
  const [editingItem, setEditingItem] = useState<OrderItem | null>(null);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [option, setOption] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [searchFood, setSearchFood] = useState("");

  const [actionLoading, setActionLoading] = useState<
    "add" | "edit" | "delete" | "status" | null
  >(null);

  const filteredFoods = foods.filter((food) =>
    food.name.toLowerCase().includes(searchFood.toLowerCase())
  );

  const updateStatus = async (newStatus: string) => {
    setActionLoading("status");
    try {
      const res = await fetch(`/api/waiter/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        const updatedOrder = await res.json();
        onUpdate((prev) =>
          prev.map((o) => (o.id === order.id ? updatedOrder : o))
        );
      } else {
        const err = await res.json();
        alert(`Update failed: ${err.error}`);
      }
    } catch (err: any) {
      alert("Network error: " + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const addItem = async () => {
    if (!order?.id || !selectedFood) return;

    const payload = {
      orderId: order.id,
      foodId: selectedFood.id,
      quantity,
      foodOptionId: option,
      notes: notes || "",
    };

    setActionLoading(editingItem ? "edit" : "add");

    try {
      const res = await fetch("/api/waiter/add-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Error: ${err.error}`);
        return;
      }

      const updatedOrder = await res.json();
      onUpdate((prev) =>
        prev.map((o) => (o.id === order.id ? updatedOrder : o))
      );

      // Reset form
      setShowAddItem(false);
      setEditingItem(null);
      setSelectedFood(null);
      setQuantity(1);
      setOption(null);
      setNotes("");
      setSearchFood("");
    } catch (err: any) {
      console.error("Add item error:", err);
      alert("Network error");
    } finally {
      setActionLoading(null);
    }
  };

  const deleteItem = async (item: OrderItem) => {
    if (!confirm(`Remove ${item.quantity}x ${item.food?.name}?`)) return;
    setActionLoading("delete");

    try {
      const res = await fetch(`/api/waiter/add-item/${item.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json();
        return alert(`Delete failed: ${err.error}`);
      }

      const updatedOrder = await res.json();
      onUpdate((prev) =>
        prev.map((o) => (o.id === order.id ? updatedOrder : o))
      );
    } catch (err: any) {
      alert("Network error: " + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const statusStyles = {
    ACCEPTED: "bg-green-100 text-green-800 border-green-300",
    PREPARING: "bg-yellow-100 text-yellow-800 border-yellow-300",
    READY: "bg-indigo-100 text-indigo-800 border-indigo-300",
    DELIVERED: "bg-gray-100 text-gray-600 border-gray-300",
    REJECTED: "bg-red-100 text-red-800 border-red-300",
  }[order.status];

  return (
    <div className="bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold text-gray-800">Order #{order.id}</h3>
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium border ${statusStyles}`}
        >
          {order.status}
        </span>
      </div>

      {/* Guest & Table */}
      <div className="space-y-1 text-sm text-gray-700 mb-3">
        <p>
          <strong>{order.customer?.name || "Guest"}</strong>
        </p>
        {order.deliveryType === "DINEIN" && (
          <p className="text-blue-600">
            Table {order.currentTableFor?.number || "?"}
          </p>
        )}
      </div>

      {/* Items */}
      <div className="flex-1 max-h-32 overflow-y-auto mb-4 text-sm">
        {order.items.length === 0 ? (
          <p className="text-gray-400 italic">No items</p>
        ) : (
          <ul className="space-y-1">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between border-b pb-1">
                <div>
                  <span>
                    {item.quantity}x {item.food?.name}
                  </span>
                  {item.foodOptionId && (
                    <span className="text-blue-600 ml-1">
                      (+
                      {
                        item.food?.options.find(
                          (o) => o.id === item.foodOptionId
                        )?.name
                      }
                      )
                    </span>
                  )}
                  {item.notes && (
                    <div className="text-xs text-gray-500">{item.notes}</div>
                  )}
                </div>
                {isToday && (
                  <button
                    onClick={() => deleteItem(item)}
                    disabled={actionLoading === "delete"}
                    className="text-red-600 hover:underline text-xs disabled:opacity-50"
                  >
                    {actionLoading === "delete" ? (
                      <div className="w-3 h-3 border-2 border-t-transparent border-red-500 rounded-full animate-spin" />
                    ) : (
                      "🗑️"
                    )}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Total */}
      <div className="border-t pt-2 mb-4">
        <div className="flex justify-between text-sm font-medium">
          Total: <span>£{order.finalAmount}</span>
        </div>
      </div>

      {/* Actions */}
      {isToday && (
        <div className="space-y-2">
          <select
            value={order.status}
            onChange={(e) => updateStatus(e.target.value)}
            disabled={actionLoading === "status"}
            className="w-full border rounded-lg px-3 py-1.5 text-sm disabled:opacity-60"
          >
            <option value="ACCEPTED">Accept Order</option>
            <option value="PREPARING">Preparing</option>
            <option value="READY">Ready</option>
            <option value="DELIVERED">Deliver</option>
          </select>

          <button
            onClick={() => {
              setEditingItem(null);
              setSelectedFood(null);
              setQuantity(1);
              setOption(null);
              setNotes("");
              setSearchFood("");
              setShowAddItem(!showAddItem);
            }}
            disabled={actionLoading !== null}
            className="w-full bg-blue-600 text-white py-1.5 rounded-lg text-sm hover:bg-blue-700 disabled:bg-gray-400 transition"
          >
            + Add Item
          </button>
        </div>
      )}

      {/* Add Item Form */}
      {showAddItem && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg border text-sm animate-fade-in">
          {!selectedFood ? (
            <>
              <input
                type="text"
                value={searchFood}
                onChange={(e) => setSearchFood(e.target.value)}
                placeholder="Search food..."
                className="w-full border p-1.5 rounded text-sm mb-2"
                autoFocus
              />
              <div className="max-h-36 overflow-y-auto border rounded">
                {filteredFoods.length === 0 ? (
                  <p className="p-2 text-gray-500 text-xs">No food found</p>
                ) : (
                  filteredFoods.map((food) => (
                    <div
                      key={food.id}
                      onClick={() => {
                        setSelectedFood(food);
                        setSearchFood("");
                      }}
                      className="p-2 hover:bg-blue-50 cursor-pointer border-b text-xs last:border-b-0"
                    >
                      {food.name} (£{food.price})
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between">
                <strong>{selectedFood.name}</strong>
                <button
                  onClick={() => {
                    setSelectedFood(null);
                    setOption(null);
                    setQuantity(1);
                    setNotes("");
                  }}
                  className="text-xs text-red-600 hover:underline"
                >
                  ← Change
                </button>
              </div>

              {selectedFood.options.length > 0 && (
                <select
                  value={option || ""}
                  onChange={(e) =>
                    setOption(e.target.value ? Number(e.target.value) : null)
                  }
                  className="w-full border p-1.5 rounded text-sm"
                >
                  <option value="">No Option</option>
                  {selectedFood.options.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name} (+£{opt.price.toFixed(2)})
                    </option>
                  ))}
                </select>
              )}

              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) =>
                  setQuantity(Math.max(1, Number(e.target.value)))
                }
                className="w-full border p-1.5 rounded text-sm"
                placeholder="Qty"
              />
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border p-1.5 rounded text-sm"
                placeholder="Notes (e.g., no onions)"
              />

              <div className="flex gap-2">
                <button
                  onClick={addItem}
                  disabled={actionLoading !== null}
                  className="flex-1 bg-green-600 text-white p-1.5 rounded text-xs hover:bg-green-700 disabled:bg-gray-400"
                >
                  {actionLoading === "add" ? (
                    <div className="flex items-center justify-center gap-1">
                      <div className="w-3 h-3 border-2 border-t-transparent border-white rounded-full animate-spin" />
                      Adding...
                    </div>
                  ) : (
                    "Add to Order"
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowAddItem(false);
                    setEditingItem(null);
                    setSelectedFood(null);
                    setQuantity(1);
                    setOption(null);
                    setNotes("");
                  }}
                  disabled={actionLoading !== null}
                  className="px-2 py-1.5 bg-gray-300 rounded text-xs hover:bg-gray-400 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
