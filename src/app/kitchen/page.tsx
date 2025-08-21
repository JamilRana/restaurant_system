// app/kitchen/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Pusher from "pusher-js";

import SearchBar from "@/components/Admin/SearchBar";
import Image from "next/image";
import OrderDetailsModal from "@/components/Order/OrderDetailsModal";
import OrderCardModal from "@/components/Kitchen/OrderCardModal";
import ProtectedRoute from "@/components/Admin/ProtectedRoute";

// === Types ===
// === Types ===
// === Types ===
type FoodOption = { id: number; name: string; price: number };
type Food = { id: number; name: string; price: number; options: FoodOption[] };

// ✅ Staff linked to User
type Staff = { id: number; name: string };

type OrderItem = {
  id: number;
  quantity: number;
  price: number;
  foodOptionId: number | null;
  notes: string | null;
  addedAt: string; // ISO date
  food: Food;
  foodOption: FoodOption | null;
};

// ✅ Correct Order type
type Order = {
  id: number;
  status: "accepted" | "preparing" | "ready" | "delivered" | "rejected";
  orderNote: string | null;
  deliveryType: "PICKUP" | "DELIVERY" | "DINEIN";
  timeSlot: string | null;
  items: OrderItem[];
  createdAt: string;
  table: { number: string } | null;
  guestName: string | null;

  // ✅ createdBy with staff name
  createdBy: {
    id: number;
    email: string;
    staff: Staff | null; // May not have a staff profile
  } | null;
};

type ApiResponse = {
  orders: Order[];
  totalPages: number;
  counts: {
    accepted: number;
    preparing: number;
    ready: number;
  };
};

// === UI Components ===
function StatusBadge({ status }: { status: string }) {
  const styles = {
    accepted: "bg-green-100 text-green-800",
    preparing: "bg-yellow-100 text-yellow-800",
    ready: "bg-indigo-100 text-indigo-800",
    delivered: "bg-gray-100 text-gray-800",
    rejected: "bg-red-100 text-red-800",
  };

  return (
    <span
      className={`px-2 py-1 rounded text-xs font-semibold capitalize ${
        styles[status as keyof typeof styles] || "bg-gray-100 text-gray-800"
      }`}
    >
      {status}
    </span>
  );
}

// Get valid next statuses
const getValidNextStatuses = (current: string) => {
  const transitions: Record<string, string[]> = {
    accepted: ["preparing", "ready"],
    preparing: ["ready"],
    ready: [],
  };
  return transitions[current] || [];
};

export default function KitchenDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [data, setData] = useState<ApiResponse | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect if not kitchen
  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "KITCHEN") {
      router.push("/auth");
    }
  }, [session, status, router]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      let url = `/api/kitchen?page=${page}&limit=10`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch");

      const json: ApiResponse = await res.json();
      setData(json);
    } catch (err) {
      console.error("Fetch failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, statusFilter, search]);

  // Setup Pusher and session guard
  useEffect(() => {
    if (status === "loading" || !session) return;

    if (!["ADMIN", "KITCHEN"].includes(session.user.role)) {
      router.push("/auth");
      return;
    }

    fetchOrders();

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      forceTLS: true,
    });

    const channelName = `restaurant-${session.user.restaurantId}`;
    const channel = pusher.subscribe(channelName);

    channel.bind("order-created", (newOrder: Order) => {
      setData((prev) => ({
        ...prev!,
        orders: [newOrder, ...(prev?.orders || [])],
      }));
    });

    channel.bind("order-updated", (updatedOrder: Order) => {
      setData((prev) => ({
        ...prev!,
        orders:
          prev?.orders.map((o) =>
            o.id === updatedOrder.id ? updatedOrder : o
          ) || [],
      }));
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, [session, status, router]);

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    try {
      console.log("Updating order:", orderId, "to status:", newStatus);

      const res = await fetch(`/api/kitchen/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const err = await res.json();
        console.error("API Error:", err);
        alert(`Update failed: ${err.error}`);
        return;
      }

      const updatedOrder = await res.json();
      console.log("Updated order:", updatedOrder);

      setData((prev) =>
        prev
          ? {
              ...prev,
              orders: prev.orders.map((o) =>
                o.id === orderId ? updatedOrder : o
              ),
            }
          : null
      );

      if (selectedOrder?.id === orderId) {
        setSelectedOrder(updatedOrder);
      }
    } catch (err: any) {
      console.error("Network error:", err);
      alert("Network error. Check console.");
    }
  };

  if (status === "loading")
    return <p className="p-6 text-center">Loading...</p>;
  if (!session || session.user.role !== "KITCHEN") return null;

  const orders = data?.orders || [];
  const counts = data?.counts || { accepted: 0, preparing: 0, ready: 0 };

  return (
    <ProtectedRoute requiredRoles={["ADMIN", "KITCHEN"]}>
      <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-gray-800">
            Kitchen Orders
          </h1>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {Object.entries(counts).map(([status, count]) => (
              <div
                key={status}
                className="bg-white p-4 rounded-lg shadow text-center cursor-pointer hover:shadow-md transition"
                onClick={() => {
                  setStatusFilter(status);
                  setPage(1);
                }}
              >
                <h3 className="font-semibold capitalize text-lg">{status}</h3>
                <p className="text-2xl font-bold text-blue-600">{count}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <SearchBar
                onSearch={setSearch}
                placeholder="Search by ID or name..."
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="border px-3 py-2 rounded"
            >
              <option value="">All Statuses</option>
              <option value="accepted">Accepted</option>
              <option value="preparing">Preparing</option>
              <option value="ready">Ready</option>
            </select>
            <button
              onClick={() => {
                setStatusFilter("");
                setSearch("");
                setPage(1);
              }}
              className="px-4 py-2 bg-red-100 text-red-800 rounded hover:bg-red-200"
            >
              Reset
            </button>
          </div>

          {/* Orders Table */}
          {loading ? (
            <p className="text-center py-4">Loading orders...</p>
          ) : orders.length === 0 ? (
            <p className="text-center py-4 text-gray-500">No orders found.</p>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">
                      ID
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">
                      Items
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {orders.map((order) => {
                    const validNext = getValidNextStatuses(order.status);
                    return (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-sm text-gray-600">
                          {String(order.id).slice(-6)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {order.items.map((item) => {
                            // ✅ Mark as "new" if added after order was created
                            const isAddedLater =
                              new Date(item.addedAt) >
                              new Date(order.createdAt);

                            return (
                              <div
                                key={item.id}
                                className={`py-1 px-2 mb-1 rounded text-sm ${
                                  isAddedLater
                                    ? "bg-orange-50 border-l-4 border-orange-500 font-semibold animate-pulse"
                                    : "border-l-4 border-transparent"
                                }`}
                              >
                                {/* Quantity + Food */}
                                <div className="flex justify-between">
                                  <span>
                                    {item.quantity}x {item.food.name}
                                    {item.foodOption &&
                                      ` (+${item.foodOption.name})`}
                                    {item.notes && ` — ${item.notes}`}
                                  </span>
                                  <span>
                                    £{(item.price * item.quantity).toFixed(2)}
                                  </span>
                                </div>

                                {/* New Item Badge */}
                                {isAddedLater && (
                                  <div className="mt-1 inline-flex items-center gap-1 text-xs bg-red-600 text-white px-2 py-0.5 rounded-full">
                                    🔁 Added Later
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {order.items && order.items.length > 3 && (
                            <div className="text-gray-500">
                              +{order.items.length - 3} more
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm capitalize">
                          {order.deliveryType.toLowerCase()}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={order.status}
                            onChange={(e) =>
                              handleStatusChange(order.id, e.target.value)
                            }
                            className="border rounded px-2 py-1 text-sm w-full mb-2"
                            disabled={validNext.length === 0}
                          >
                            <option value={order.status} disabled>
                              {order.status} (current)
                            </option>
                            {validNext.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>

                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                          >
                            <Image
                              src="/icons/details.png"
                              alt="Details"
                              width={16}
                              height={16}
                            />
                            Details
                          </button>

                          {/* ✅ Show Staff Name */}
                          <div className="text-xs text-gray-600 mt-1">
                            By:{" "}
                            {order.createdBy?.staff?.name ||
                              order.createdBy?.email.split("@")[0] ||
                              "Unknown"}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {data?.totalPages && data.totalPages > 1 && (
            <div className="flex justify-between items-center mt-6">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-300"
              >
                Previous
              </button>
              <span>
                Page {page} of {data.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(p + 1, data.totalPages))}
                disabled={page === data.totalPages}
                className="bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-300"
              >
                Next
              </button>
            </div>
          )}

          {/* Modal */}
          {selectedOrder && (
            <OrderCardModal
              order={selectedOrder}
              onClose={() => setSelectedOrder(null)}
            />
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
