"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Pusher from "pusher-js";

import SearchBar from "@/components/Admin/SearchBar";
import Image from "next/image";
import OrderCardModal from "@/components/Kitchen/OrderCardModal";
import ProtectedRoute from "@/components/Admin/ProtectedRoute";

type FoodOption = { id: number; name: string; price: number };
type Food = { id: number; name: string; price: number; options: FoodOption[] };

type Staff = { id: number; name: string };

type OrderItem = {
  id: number;
  quantity: number;
  price: number;
  foodOptionId: number | null;
  notes: string | null;
  addedAt: string;
  food: Food;
  foodOption: FoodOption | null;
};

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
  createdBy: {
    id: number;
    email: string;
    staff: Staff | null;
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

// === Status Badge ===
function StatusBadge({ status }: { status: string }) {
  const styles = {
    accepted: "bg-green-100 text-green-800 border-green-300",
    preparing: "bg-yellow-100 text-yellow-800 border-yellow-300",
    ready: "bg-indigo-100 text-indigo-800 border-indigo-300",
    delivered: "bg-gray-100 text-gray-600 border-gray-300",
    rejected: "bg-red-100 text-red-800 border-red-300",
  };

  return (
    <span
      className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
        styles[status as keyof typeof styles] || "bg-gray-100 text-gray-800"
      }`}
    >
      {status}
    </span>
  );
}

// === Valid Status Transitions ===
const getValidNextStatuses = (current: string) => {
  const transitions: Record<string, string[]> = {
    ACCEPTED: ["PREPARING"],
    PREPARING: ["READY"],
    READY: [],
  };
  return transitions[current] || [];
};

// === Format Time ===
const formatTime = (date: string) => {
  return new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
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

  useEffect(() => {
    if (status === "loading") return;
    if (!session || !["ADMIN", "KITCHEN"].includes(session.user.role)) {
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

  // Pusher & Session Setup
  useEffect(() => {
    if (status === "loading" || !session) return;

    if (!["ADMIN", "KITCHEN"].includes(session.user.role)) {
      router.push("/auth");
      return;
    }

    fetchOrders();

    if (typeof window !== "undefined") {
      const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        forceTLS: true,
      });

      const channelName = `restaurant-${session.user.restaurantId}`;
      const channel = pusher.subscribe(channelName);

      channel.bind("order-updated", (updatedOrder: Order) => {
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            orders: prev.orders.map((o) =>
              o.id === updatedOrder.id ? updatedOrder : o
            ),
          };
        });

        if (selectedOrder?.id === updatedOrder.id) {
          setSelectedOrder(updatedOrder);
        }
      });

      channel.bind("order-created", (newOrder: Order) => {
        setData((prev) => {
          if (!prev)
            return {
              orders: [newOrder],
              totalPages: 1,
              counts: { accepted: 0, preparing: 0, ready: 0 },
            };
          return {
            ...prev,
            orders: [newOrder, ...prev.orders],
          };
        });
      });

      return () => {
        channel.unbind_all();
        channel.unsubscribe();
        pusher.disconnect();
      };
    }
  }, [session, status, router]);

  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    setActionLoading(orderId);
    try {
      const res = await fetch(`/api/kitchen/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Update failed: ${err.error}`);
        return;
      }

      const updatedOrder = await res.json();
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          orders: prev.orders.map((o) => (o.id === orderId ? updatedOrder : o)),
        };
      });

      if (selectedOrder?.id === orderId) {
        setSelectedOrder(updatedOrder);
      }
    } catch (err: any) {
      console.error("Network error:", err);
      alert("Network error. Check console.");
    } finally {
      setActionLoading(null);
    }
  };

  if (status === "loading")
    return <p className="p-6 text-center">Loading...</p>;
  if (!session || !["ADMIN", "KITCHEN"].includes(session.user.role))
    return null;

  const orders = data?.orders || [];
  const counts = data?.counts || { accepted: 0, preparing: 0, ready: 0 };

  return (
    <ProtectedRoute requiredRoles={["ADMIN", "KITCHEN"]}>
      <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-gray-800 flex items-center gap-2">
            Kitchen Orders
          </h1>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {Object.entries(counts).map(([status, count]) => (
              <div
                key={status}
                className={`p-4 rounded-xl text-center cursor-pointer transition-all transform hover:scale-105 ${
                  status === "accepted"
                    ? "bg-white shadow"
                    : status === "preparing"
                    ? "bg-yellow-50 border border-yellow-200"
                    : "bg-indigo-50 border border-indigo-200"
                }`}
                onClick={() => {
                  setStatusFilter(status);
                  setPage(1);
                }}
              >
                <h3 className="font-semibold capitalize text-lg">{status}</h3>
                <p className="text-3xl font-bold">{count}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="bg-white p-5 rounded-xl shadow-sm mb-6 flex flex-col lg:flex-row gap-4 items-center">
            <div className="flex-1">
              <SearchBar
                onSearch={setSearch}
                placeholder="Search by ID, name..."
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="border px-4 py-2 rounded-lg text-sm min-w-36"
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
              className="px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 text-sm"
            >
              Reset
            </button>
          </div>

          {/* Orders Table */}
          {loading ? (
            <div className="text-center py-10">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mr-3"></div>
              Loading orders...
            </div>
          ) : orders.length === 0 ? (
            <p className="text-center py-12 text-gray-500 text-lg">
              No orders found.
            </p>
          ) : (
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">
                      ID
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">
                      Items
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">
                      Type
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">
                      Status
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.map((order) => {
                    const validNext = getValidNextStatuses(order.status);
                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-gray-25 transition-colors"
                      >
                        <td className="px-6 py-4 font-mono text-sm text-gray-600">
                          {String(order.id).padStart(6, "0")}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {order.items.slice(0, 2).map((item) => (
                            <div key={item.id} className="py-1">
                              <span className="font-medium text-gray-800">
                                {item.quantity}x {item.food.name}
                              </span>
                              {item.foodOption && (
                                <span className="text-blue-600 ml-1">
                                  (+{item.foodOption.name})
                                </span>
                              )}
                              {item.notes && (
                                <div className="text-xs text-gray-500 mt-0.5">
                                  Note: {item.notes}
                                </div>
                              )}
                            </div>
                          ))}
                          {order.items.length > 2 && (
                            <div className="text-xs text-gray-500 mt-1">
                              +{order.items.length - 2} more
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm capitalize font-medium">
                          {order.deliveryType}
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="px-6 py-4 space-y-2">
                          {validNext.length > 0 ? (
                            <select
                              value={order.status}
                              onChange={(e) =>
                                handleStatusChange(order.id, e.target.value)
                              }
                              className="border rounded px-3 py-1.5 text-sm w-full"
                            >
                              <option value={order.status} disabled>
                                {order.status} (current)
                              </option>
                              {validNext.map((status) => (
                                <option key={status} value={status}>
                                  → {status}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-gray-400 text-sm">
                              No actions
                            </span>
                          )}

                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="w-full mt-2 text-blue-600 hover:text-blue-800 text-sm flex items-center justify-center gap-1 py-1.5 border border-blue-200 rounded"
                          >
                            <Image
                              src="/icons/details.png"
                              alt="Details"
                              width={14}
                              height={14}
                            />
                            Details
                          </button>

                          <div className="text-xs text-gray-500 mt-1">
                            By:{" "}
                            {order.createdBy?.staff?.name ||
                              order.createdBy?.email.split("@")[0] ||
                              "Staff"}
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
            <div className="flex justify-center mt-8">
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 rounded-l-lg text-sm"
                >
                  ← Prev
                </button>
                <button
                  onClick={() =>
                    setPage((p) => Math.min(p + 1, data.totalPages))
                  }
                  disabled={page === data.totalPages}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 rounded-r-lg text-sm"
                >
                  Next →
                </button>
              </div>
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
