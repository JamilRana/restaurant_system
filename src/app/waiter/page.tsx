"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Pusher from "pusher-js";
import SearchBar from "@/components/Admin/SearchBar";
import DateRangePicker from "@/components/DateRangePicker";
import Pagination from "@/components/Pagination";

type FoodOption = { id: number; name: string; price: number };
type Food = { id: number; name: string; price: number; options: FoodOption[] };
type OrderItem = {
  id: number;
  quantity: number;
  price: number;
  foodOptionId: number | null;
  notes: string | null;
  food: Food;
};
type Order = {
  id: number;
  status: "accepted" | "preparing" | "ready" | "delivered" | "rejected";
  totalAmount: number;
  deliveryType: "DINEIN" | "PICKUP";
  guestName: string;
  table: { number: string } | null;
  items: OrderItem[];
  createdAt: string;
};

export default function WaiterDashboard() {
  const {  data:session, status } = useSession();
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [foods, setFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"active" | "all">("active");
  const [search, setSearch] = useState("");
  const today = new Date();
  const formatDate = (date: Date) => date.toISOString().split("T")[0];

  const [dateRange, setDateRange] = useState<{
    startDate: Date | null;
    endDate: Date | null;
  }>({
    startDate: today,
    endDate: today,
  });

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      let url = `/api/waiter/orders?page=${page}&limit=10`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (dateRange.startDate) url += `&startDate=${formatDate(dateRange.startDate)}`;
      if (dateRange.endDate) url += `&endDate=${formatDate(dateRange.endDate)}`;
      if (activeTab === "active") url += "&status=accepted,preparing,ready";

      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch orders");
      const data = await res.json();
      setOrders(data.orders);
      setTotalPages(data.totalPages);
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

  useEffect(() => {
    if (status === "loading" || !session) return;

    if (!["ADMIN", "WAITER","KITCHEN"].includes(session.user.role)) {
      router.push("/auth");
      return;
    }

    

    fetchOrders();
    fetchFoods();{/*

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      forceTLS: true,
    });

    const channelName = `restaurant-${session.user.restaurantId}`;
    const channel = pusher.subscribe(channelName);

    channel.bind("order-created", (order: Order) => {
      setOrders(prev => [order, ...prev]);
    });

    channel.bind("order-updated", (order: Order) => {
      if (order.status === "ready") {
        alert(`Order #${order.id} is ready!`);
      }
      setOrders(prev => prev.map(o => o.id === order.id ? order : o));
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
    */}
  }, [session, status, router]);
  

  useEffect(() => {
    
    fetchOrders();
  }, [page, search, dateRange, activeTab]);

  const filteredOrders = activeTab === "active"
    ? orders.filter(o => !["delivered", "rejected"].includes(o.status))
    : orders;

  if (status === "loading" || loading) return <div className="p-6 text-center">Loading...</div>;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">Waiter Dashboard</h1>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-lg mb-6 space-y-4">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex-1 min-w-48">
            <SearchBar onSearch={setSearch} placeholder="Search by ID, name..." />
          </div>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab("active")}
            className={`px-5 py-2 rounded-full font-medium transition ${
              activeTab === "active"
                ? "bg-blue-600 text-white shadow"
                : "bg-gray-100 hover:bg-gray-200 text-gray-700"
            }`}
          >
            🕒 Active Orders
          </button>
          <button
            onClick={() => setActiveTab("all")}
            className={`px-5 py-2 rounded-full font-medium transition ${
              activeTab === "all"
                ? "bg-blue-600 text-white shadow"
                : "bg-gray-100 hover:bg-gray-200 text-gray-700"
            }`}
          >
            📋 All Orders
          </button>
        </div>
      </div>

      {/* Orders Grid */}
      {filteredOrders.length === 0 ? (
        <p className="text-gray-500 text-center py-12 text-lg">No orders found.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {filteredOrders.map(order => (
            <OrderCard key={order.id} order={order} foods={foods} onUpdate={setOrders} />
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
  );
}

// Order Card
function OrderCard({ order, foods, onUpdate }: { order: Order; foods: Food[]; onUpdate: React.Dispatch<React.SetStateAction<Order[]>> }) {
  const [showAddItem, setShowAddItem] = useState(false);
  const [editingItem, setEditingItem] = useState<OrderItem | null>(null);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [option, setOption] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [searchFood, setSearchFood] = useState("");

  const filteredFoods = foods.filter(food =>
    food.name.toLowerCase().includes(searchFood.toLowerCase())
  );

  const editItem = (item: OrderItem) => {
    setEditingItem(item);
    setSelectedFood(item.food);
    setQuantity(item.quantity);
    setOption(item.foodOptionId);
    setNotes(item.notes || "");
    setShowAddItem(true);
  };

const removeItem = async (itemId: number) => {
  try {
    const res = await fetch(`/api/waiter/add-item/${itemId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const err = await res.json();
      console.error("Delete failed:", err);
      alert(`Delete failed: ${err.error}`);
      return;
    }

    const updatedOrder = await res.json();
    onUpdate(prev => prev.map(o => o.id === order.id ? updatedOrder : o));
  } catch (err: any) {
    console.error("Network error:", err);
    alert("Network error. Check console.");
  }
};

 const addItem = async () => {
  // 🔥 Critical Debug
  console.log("📦 Order passed to OrderCard:", order);
  if (!order?.id) {
    console.error("❌ order.id is missing!");
    alert("Order is invalid. Refresh and try again.");
    return;
  }

  const payload = {
    orderId: order.id,
    foodId: selectedFood!.id,
    quantity,
    foodOptionId: option,
    notes: notes || "",
  };

  console.log("📤 Sending to /api/waiter/add-item:", payload);

  try {
    const res = await fetch("/api/waiter/add-item", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error("❌ Add item failed:", err);
      alert(`Error: ${err.error}`);
      return;
    }

    const updatedOrder = await res.json();
    console.log("✅ Item added, updated order:", updatedOrder);

    // Update UI
    onUpdate(prev => prev.map(o => o.id === order.id ? updatedOrder : o));

    // Reset form
    setEditingItem(null);
    setShowAddItem(false);
    setSelectedFood(null);
    setQuantity(1);
    setOption(null);
    setNotes("");
    setSearchFood("");
  } catch (err: any) {
    console.error("🚨 Network error:", err);
    alert("Network error. Check console.");
  }
};

  const updateStatus = async (newStatus: string) => {
    const res = await fetch(`/api/waiter/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    if (res.ok) {
      const updatedOrder = await res.json();
      onUpdate(prev => prev.map(o => o.id === order.id ? updatedOrder : o));
    } else {
      const err = await res.json();
      alert(`Update failed: ${err.error}`);
    }
  };

  // Status badge styles
  const statusStyles = {
    accepted: "bg-green-100 text-green-800 border-green-300",
    preparing: "bg-yellow-100 text-yellow-800 border-yellow-300",
    ready: "bg-indigo-100 text-indigo-800 border-indigo-300",
    delivered: "bg-gray-100 text-gray-800 border-gray-300",
    rejected: "bg-red-100 text-red-800 border-red-300",
  }[order.status] || "bg-gray-100";

  return (
    <div className="border-2 rounded-xl p-5 bg-white shadow-lg hover:shadow-xl transition">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-xl font-bold text-gray-800">Order #{order.id}</h3>
        <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${statusStyles}`}>
          {order.status}
        </span>
      </div>

      {/* Info */}
      <div className="space-y-1 text-sm text-gray-700 mb-4">
        <p><strong>Guest:</strong> {order.guestName}</p>
        <p>
          <strong>Type:</strong>{" "}
          {order.deliveryType === "DINEIN"
            ? `Dine-in • Table ${order.table?.number || "?"}`
            : "Pickup"}
        </p>
        <p><strong>Total:</strong> £{order.totalAmount.toFixed(2)}</p>
      </div>

      {/* Items */}
      <div className="border-t pt-3 mb-4">
        <h4 className="font-medium mb-2">Items:</h4>
        <ul className="space-y-1 text-sm">
          {order.items.map(item => {
            const option = item.food?.options?.find(o => o.id === item.foodOptionId) || null;
            const price = item.price * item.quantity;
            return (
              <li key={item.id} className="flex justify-between border-b pb-1">
                <span>
                  {item.quantity}x {item.food?.name || "Unknown"}
                  {option && ` (+${option.name})`}
                  {item.notes && ` — ${item.notes}`}
                </span>
                <span className="flex items-center gap-2">
                  £{price.toFixed(2)}
                  <button
                    onClick={() => editItem(item)}
                    className="text-xs text-blue-600 hover:underline ml-2"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-xs text-red-600 hover:underline ml-2"
                  >
                    Remove
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        {/* Status Action */}
        {order.status === "ready" ? (
          <button
            onClick={() => updateStatus("delivered")}
            className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
          >
            🚀 Deliver Order
          </button>
        ) : order.status === "delivered" ? (
          <span className="w-full text-center py-2 bg-gray-100 text-gray-600 rounded-lg text-sm">
            ✅ Delivered
          </span>
        ) : (
          <select
            value={order.status}
            onChange={(e) => updateStatus(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          >
            <option value={order.status} disabled>
              {order.status} (current)
            </option>
            {["accepted", "preparing", "ready"].includes(order.status) && (
              <option value="delivered">Mark as Delivered</option>
            )}
          </select>
        )}

        {/* Add/Edit Item */}
        <div>
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
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
          >
            {editingItem ? "Edit Item" : "+ Add Item"}
          </button>

          {showAddItem && (
            <div className="mt-3 p-4 bg-gray-50 rounded-lg border">
              {!selectedFood ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={searchFood}
                    onChange={(e) => setSearchFood(e.target.value)}
                    placeholder="Search food..."
                    className="w-full border p-2 rounded"
                    autoFocus
                  />

                  <div className="max-h-48 overflow-y-auto border rounded">
                    {filteredFoods.length === 0 ? (
                      <p className="p-2 text-gray-500">No food found</p>
                    ) : (
                      filteredFoods.map(food => (
                        <div
                          key={food.id}
                          onClick={() => {
                            setSelectedFood(food);
                            setSearchFood("");
                          }}
                          className="p-2 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                        >
                          {food.name} (£{food.price.toFixed(2)})
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <strong>{selectedFood.name}</strong>
                    <button
                      onClick={() => {
                        setSelectedFood(null);
                        setOption(null);
                        setQuantity(1);
                        setNotes("");
                      }}
                      className="text-sm text-red-600 hover:underline"
                    >
                      ← Change Food
                    </button>
                  </div>

                  {selectedFood.options.length > 0 && (
                    <select
                      value={option || ""}
                      onChange={(e) => setOption(e.target.value ? Number(e.target.value) : null)}
                      className="w-full border p-2 rounded"
                    >
                      <option value="">No Option</option>
                      {selectedFood.options.map(opt => (
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
                    onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                    className="w-full border p-2 rounded"
                    placeholder="Quantity"
                  />
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full border p-2 rounded mb-2"
                    placeholder="Notes (e.g., no onions)"
                  />

                  <div className="flex gap-2">
                    <button
                      onClick={addItem}
                      disabled={!selectedFood}
                      className="flex-1 bg-green-600 text-white p-2 rounded hover:bg-green-700 disabled:bg-gray-400"
                    >
                      {editingItem ? "Update Item" : "Add to Order"}
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
                      className="px-3 py-2 bg-gray-300 rounded hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}