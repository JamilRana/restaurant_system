// app/orders/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import OrderDetailModal from "@/components/Order/OrderDetailsModal";
import { useBasketStore } from "../store/basketStore";
import { RouteLoader } from "@/components/RouteLoader";

export default function OrderList() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [totalPages, setTotalPages] = useState(1);

  // ✅ useCallback: must be at top, before any returns
  const fetchOrders = useCallback(async () => {
    if (!session?.user?.email) return;
    setIsLoading(true);

    try {
      const res = await fetch(
        `/api/orderlist?role=${session.user.role}&id=${
          session.user.id
        }&limit=10&page=${page}${
          statusFilter ? `&status=${statusFilter}` : ""
        }`,
        {
          cache: "no-store",
        }
      );

      if (!res.ok) throw new Error("Failed to fetch orders");

      const data = await res.json();
      setOrders(data.orders || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error("Failed to load orders", error);
    } finally {
      setIsLoading(false);
    }
  }, [session, page, statusFilter]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  const handleRepeatOrder = useCallback(
    async (orderId: number) => {
      try {
        const res = await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.error);

        useBasketStore.getState().replaceBasket(data.items, data.id);
        useBasketStore.getState().setOrderNote(data.orderNote || "");
        useBasketStore.getState().setPostcode(data.postcode || "");
        useBasketStore.getState().setAddress(data.address || "");
        useBasketStore
          .getState()
          .setDeliveryMode(
            data.deliveryType === "DELIVERY" ? "delivery" : "collection"
          );

        router.push("/checkout");
      } catch (error) {
        console.error("Failed to repeat order", error);
        alert("Could not repeat order. Please try again.");
      }
    },
    [router]
  );

  // ✅ useEffects also at top
  useEffect(() => {
    if (status === "authenticated") {
      fetchOrders();
    }
  }, [status, fetchOrders]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth");
    }
  }, [status, router]);

  // ✅ Now it's safe to do conditional rendering
  if (status === "loading" && isLoading) {
    return <RouteLoader />;
  }

  if (status === "unauthenticated") {
    return null;
  }
  const activeStatuses = ["PLACED", "ACCEPTED", "PREPARING", "READY"];
  const activeOrders = orders.filter((o) => activeStatuses.includes(o.status));
  const historyOrders = orders.filter(
    (o) => !activeStatuses.includes(o.status)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-2 text-gray-800">
          My Orders
        </h2>
        <p className="text-center text-gray-600 mb-8">
          Track your current orders and repeat past ones
        </p>

        {/* Filter */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 shadow-sm"
          >
            <option value="">All Orders</option>
            <option value="PLACED">Placed</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="PREPARING">Preparing</option>
            <option value="READY">Ready</option>
            <option value="DELIVERED">Delivered</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        {/* Active Orders */}
        {activeOrders.length > 0 && (
          <section className="mb-12">
            <h3 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
              <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
              Active Orders
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onDetails={() => setSelectedOrder(order)}
                  onRepeat={() => handleRepeatOrder(order.id)}
                />
              ))}
            </div>
          </section>
        )}

        {historyOrders.length > 0 && (
          <section>
            <h3 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
              <span className="w-3 h-3 bg-gray-400 rounded-full"></span>
              Order History
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {historyOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onDetails={() => setSelectedOrder(order)}
                  onRepeat={() => handleRepeatOrder(order.id)}
                />
              ))}
            </div>
          </section>
        )}
        {/* Empty State */}
        {orders.length === 0 && (
          <div className="text-center py-16 bg-white/60 backdrop-blur-sm rounded-2xl shadow">
            <h3 className="text-xl font-medium text-gray-700 mb-2">
              No orders found
            </h3>
            <p className="text-gray-500">
              Your order history will appear here.
            </p>
          </div>
        )}
        <div className="flex justify-between items-center mt-6">
          <button
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            disabled={page === 1}
            className="bg-gray-300 px-3 py-1 rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={page === totalPages}
            className="bg-gray-300 px-3 py-1 rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>

        {selectedOrder && (
          <OrderDetailModal
            order={selectedOrder}
            onClose={() => setSelectedOrder(null)}
          />
        )}
      </div>
    </div>
  );
}

// ✅ Compact Glass Card
function OrderCard({ order, onDetails, onRepeat }: any) {
  const statusColors = {
    PLACED: "bg-blue-100 text-blue-800",
    ACCEPTED: "bg-indigo-100 text-indigo-800",
    PREPARING: "bg-orange-100 text-orange-800",
    READY: "bg-green-100 text-green-800",
    DELIVERED: "bg-gray-100 text-gray-800",
    REJECTED: "bg-red-100 text-red-800",
  };

  const formattedDate = new Date(order.createdAt).toLocaleDateString();

  return (
    <div className="bg-white/90 backdrop-blur-sm border border-gray-200/60 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="font-bold text-gray-800">#{order.id}</p>
          <p className="text-sm text-gray-600">{formattedDate}</p>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full `}>
          {order.status}
        </span>
      </div>

      <p className="text-lg font-semibold text-gray-800 mb-1">
        £{order.finalAmount || order.totalAmount}
      </p>
      <p className="text-sm text-gray-600">{order.restaurant?.name}</p>

      <div className="flex gap-3 mt-4">
        <button
          onClick={onDetails}
          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium py-2 rounded-lg transition"
        >
          Details
        </button>
        <button
          onClick={onRepeat}
          className="flex-1 bg-green-500 hover:bg-green-600 text-white text-sm font-medium py-2 rounded-lg transition"
        >
          Repeat
        </button>
      </div>
    </div>
  );
}
