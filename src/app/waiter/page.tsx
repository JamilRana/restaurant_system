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

// Types - ✅ FIXED: Match Prisma schema exactly
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
type SplitBill = {
  id: number;
  amount: number;
  isPaid: boolean;
  paymentMethod: "CARD" | "CASH";
  cashGiven: number | null;
};

// ✅ FIXED: Updated to match Prisma schema
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
  createdById: number | null;
  // ✅ PAYMENT FIELDS - Match Prisma exactly
  paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  paymentMethod: "CARD" | "CASH" | null;
  // Remove isPaid - use paymentStatus instead
  // Split billing (keep as is)
  isSplit: boolean;
  splitBills: SplitBill[];
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
        const start = new Date(today);
        start.setHours(0, 0, 0, 0);
        const end = new Date(today);
        end.setHours(23, 59, 59, 999);
        url += `&startDate=${start.toISOString()}&endDate=${end.toISOString()}`;
      }

      const staffId = session?.user.id;
      if (staffId) {
        url += `&createdById=${staffId}`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();

      // ✅ FIXED: Ensure paymentStatus is properly typed
      const typedOrders = data.orders.map((order: any) => ({
        ...order,
        paymentStatus: order.paymentStatus || "PENDING",
        paymentMethod: order.paymentMethod || null,
      }));

      setOrders(typedOrders);
      setTotalPages(data.totalPages);
      setTotalOrdersCount(data.totalCount);

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

// OrderCard - ✅ FIXED: Use paymentStatus instead of isPaid
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
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [option, setOption] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [searchFood, setSearchFood] = useState("");
  const [actionLoading, setActionLoading] = useState<
    "add" | "edit" | "delete" | "status" | "payment" | "split" | null
  >(null);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitAmount, setSplitAmount] = useState("");

  const filteredFoods = foods.filter((food) =>
    food.name.toLowerCase().includes(searchFood.toLowerCase())
  );

  // ✅ FIXED: Calculate unpaid amount using paymentStatus
  const isOrderPaid = order.paymentStatus === "PAID";
  const unpaidAmount = order.isSplit
    ? order.splitBills
        .filter((bill) => !bill.isPaid)
        .reduce((sum, bill) => sum + bill.amount, 0)
    : isOrderPaid
    ? 0
    : order.finalAmount;

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
      }
    } catch (err) {
      console.error("Status update failed:", err);
    } finally {
      setActionLoading(null);
    }
  };

  // ✅ FIXED: Update payment status via API
  const markAsPaid = async (method: "CARD" | "CASH") => {
    setActionLoading("payment");
    try {
      const res = await fetch(`/api/waiter/orders/${order.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentStatus: "PAID",
          paymentMethod: method,
        }),
      });

      if (res.ok) {
        const updatedOrder = await res.json();
        onUpdate((prev) =>
          prev.map((o) => (o.id === order.id ? updatedOrder : o))
        );
      }
    } catch (err) {
      console.error("Payment failed:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const createSplitBill = async () => {
    const amount = parseFloat(splitAmount);
    if (isNaN(amount) || amount <= 0 || amount > unpaidAmount) {
      alert("Enter a valid amount");
      return;
    }

    setActionLoading("split");
    try {
      const res = await fetch(`/api/waiter/orders/${order.id}/split`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      if (res.ok) {
        const updatedOrder = await res.json();
        onUpdate((prev) =>
          prev.map((o) => (o.id === order.id ? updatedOrder : o))
        );
        setShowSplitModal(false);
        setSplitAmount("");
      }
    } catch (err) {
      console.error("Split bill failed:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const markSplitAsPaid = async (
    splitId: number,
    method: "CARD" | "CASH",
    cashGiven?: number
  ) => {
    setActionLoading("payment");
    try {
      const res = await fetch(`/api/waiter/split/${splitId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod: method, cashGiven }),
      });
      if (res.ok) {
        const updatedOrder = await res.json();
        onUpdate((prev) =>
          prev.map((o) => (o.id === order.id ? updatedOrder : o))
        );
      }
    } catch (err) {
      console.error("Split payment failed:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const addItem = async () => {
    if (!order?.id || !selectedFood) return;
    setActionLoading("add");
    try {
      const res = await fetch("/api/waiter/orders/add-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          foodId: selectedFood.id,
          quantity,
          foodOptionId: option,
          notes: notes || "",
        }),
      });
      if (res.ok) {
        const updatedOrder = await res.json();
        onUpdate((prev) =>
          prev.map((o) => (o.id === order.id ? updatedOrder : o))
        );
        setShowAddItem(false);
        setSelectedFood(null);
        setQuantity(1);
        setOption(null);
        setNotes("");
        setSearchFood("");
      }
    } catch (err) {
      console.error("Add item failed:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const deleteItem = async (item: OrderItem) => {
    if (!confirm(`Remove ${item.quantity}x ${item.food?.name}?`)) return;
    setActionLoading("delete");
    try {
      const res = await fetch(`/api/waiter/orders/add-item/${item.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        const updatedOrder = await res.json();
        onUpdate((prev) =>
          prev.map((o) => (o.id === order.id ? updatedOrder : o))
        );
      }
    } catch (err) {
      console.error("Delete item failed:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const statusConfig = {
    ACCEPTED: {
      bg: "bg-green-100",
      text: "text-green-800",
      border: "border-green-300",
    },
    PREPARING: {
      bg: "bg-yellow-100",
      text: "text-yellow-800",
      border: "border-yellow-300",
    },
    READY: {
      bg: "bg-indigo-100",
      text: "text-indigo-800",
      border: "border-indigo-300",
    },
    DELIVERED: {
      bg: "bg-gray-100",
      text: "text-gray-600",
      border: "border-gray-300",
    },
    REJECTED: {
      bg: "bg-red-100",
      text: "text-red-800",
      border: "border-red-300",
    },
  };
  const statusStyle = statusConfig[order.status] || statusConfig.ACCEPTED;

  // ✅ FIXED: Render payment info using paymentStatus
  const renderPaymentInfo = () => {
    return (
      <div className="mt-2">
        <div className="flex justify-between text-sm">
          <span>Payment: {order.paymentMethod || "N/A"}</span>
          {order.paymentMethod === "CASH" && (
            <span className="text-gray-600">Status: {order.paymentStatus}</span>
          )}
        </div>
        {order.paymentStatus !== "PAID" && (
          <div className="mt-2 space-y-2">
            <button
              onClick={() => markAsPaid("CARD")}
              disabled={actionLoading === "payment"}
              className="w-full bg-blue-600 text-white py-1.5 rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-70"
            >
              Mark as Paid (Card)
            </button>
            <button
              onClick={() => markAsPaid("CASH")} // ✅ No cash amount prompt
              disabled={actionLoading === "payment"}
              className="w-full bg-green-600 text-white py-1.5 rounded text-xs font-medium hover:bg-green-700 disabled:opacity-70"
            >
              Mark as Paid (Cash)
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition flex flex-col h-full">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-bold text-lg text-gray-900">Order #{order.id}</h3>
          <div className="flex flex-wrap gap-1 mt-1">
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
            >
              {order.status}
            </span>
            {/* ✅ FIXED: Use paymentStatus for unpaid badge */}
            {!isOrderPaid && !order.isSplit && (
              <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium border border-red-300">
                Unpaid
              </span>
            )}
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium border border-blue-300">
              {order.deliveryType}
            </span>
          </div>
        </div>
      </div>

      {/* Guest & Table */}
      <div className="space-y-1 text-sm text-gray-700 mb-3">
        <p className="font-medium">
          {order.customer?.name || "Guest"}
          {order.customer?.email && (
            <span className="block text-xs text-gray-500">
              {order.customer.email}
            </span>
          )}
        </p>
        {order.deliveryType === "DINEIN" && (
          <p className="text-blue-600 font-medium">
            Table {order.currentTableFor?.number || "?"}
          </p>
        )}
      </div>

      {/* Items Summary */}
      <div className="flex-1 max-h-32 overflow-y-auto mb-4 text-sm bg-gray-50 p-2 rounded">
        {order.items.length === 0 ? (
          <p className="text-gray-400 italic text-center py-1">No items</p>
        ) : (
          <ul className="space-y-1">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between">
                <div className="font-medium">
                  {item.quantity}x {item.food?.name}
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
                </div>
                <span className="font-bold text-green-700">
                  £{item.price * item.quantity}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Total & Payment */}
      <div className="border-t pt-2 mb-4">
        <div className="flex justify-between text-lg font-bold text-gray-900">
          Total: <span>£{order.finalAmount}</span>
        </div>
        {renderPaymentInfo()}
      </div>

      {/* Action Buttons */}
      {isToday && (
        <div className="space-y-2">
          <select
            value={order.status}
            onChange={(e) => updateStatus(e.target.value)}
            disabled={actionLoading === "status"}
            className="w-full border rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-60"
          >
            <option value="ACCEPTED">✅ Accept</option>
            <option value="PREPARING">👨‍🍳 Preparing</option>
            <option value="READY">🎉 Ready</option>
            <option value="DELIVERED">📦 Delivered</option>
          </select>

          <button
            onClick={() => {
              setShowAddItem(!showAddItem);
              if (!showAddItem) {
                setSelectedFood(null);
                setQuantity(1);
                setOption(null);
                setNotes("");
                setSearchFood("");
              }
            }}
            disabled={actionLoading !== null || order.paymentStatus === "PAID"}
            hidden={
              order.deliveryType === "PICKUP" || order.paymentStatus === "PAID"
            }
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-bold hover:bg-blue-700 disabled:bg-gray-400 transition"
          >
            + Add Item
          </button>
        </div>
      )}

      {/* Quick Add Form */}
      {showAddItem && (
        <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200 animate-fade-in">
          {!selectedFood ? (
            <>
              <input
                type="text"
                value={searchFood}
                onChange={(e) => setSearchFood(e.target.value)}
                placeholder="Search food..."
                className="w-full border border-blue-300 p-2 rounded text-sm mb-2"
                autoFocus
              />
              <div className="max-h-40 overflow-y-auto border border-blue-200 rounded">
                {filteredFoods.length === 0 ? (
                  <p className="p-2 text-gray-500 text-sm">No food found</p>
                ) : (
                  filteredFoods.map((food) => (
                    <div
                      key={food.id}
                      onClick={() => {
                        setSelectedFood(food);
                        setSearchFood("");
                      }}
                      className="p-2 hover:bg-blue-100 cursor-pointer border-b border-blue-100 text-sm last:border-b-0"
                    >
                      <div className="font-medium">{food.name}</div>
                      <div className="text-xs text-gray-600">£{food.price}</div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <strong className="text-sm">{selectedFood.name}</strong>
                <button
                  onClick={() => setSelectedFood(null)}
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
                  className="w-full border p-2 rounded text-sm"
                >
                  <option value="">No Option</option>
                  {selectedFood.options.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name} (+£{opt.price})
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
                className="w-full border p-2 rounded text-sm"
                placeholder="Quantity"
              />
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border p-2 rounded text-sm"
                placeholder="Special instructions"
              />

              <div className="flex gap-2">
                <button
                  onClick={addItem}
                  disabled={actionLoading === "add"}
                  className="flex-1 bg-green-600 text-white p-2 rounded font-medium hover:bg-green-700 disabled:bg-gray-400 text-sm"
                >
                  {actionLoading === "add" ? "Adding..." : "Add to Order"}
                </button>
                <button
                  onClick={() => setShowAddItem(false)}
                  className="px-3 py-2 bg-gray-300 rounded font-medium hover:bg-gray-400 text-sm"
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
