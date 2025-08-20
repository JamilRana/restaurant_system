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
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [totalPages, setTotalPages] = useState(1);
  const router = useRouter();

  // ✅ Wrap fetchOrders in useCallback so it doesn't change on every render
  const fetchOrders = useCallback(async () => {
    if (!session?.user?.email) return;

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
    }
  }, [session, page, statusFilter]);

  // ✅ Now safe to add fetchOrders as dependency
  useEffect(() => {
    if (status === "authenticated") {
      fetchOrders();
    }
  }, [status, fetchOrders]);

  // 🔁 Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth");
    }
  }, [status, router]);

  // Show loader while loading
  if (status === "loading") {
    return <RouteLoader />;
  }

  if (status === "unauthenticated") {
    return null;
  }

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

        useBasketStore.getState().replaceBasket(data.id, data.items);
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

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">My Orders</h2>

      <div className="mb-4">
        <label className="mr-2 font-medium">Filter by status:</label>
        <select
          className="border px-2 py-1 rounded"
          value={statusFilter}
          onChange={handleFilterChange}
        >
          <option value="">All</option>
          <option value="placed">Placed</option>
          <option value="accepted">Accepted</option>
          <option value="preparing">Preparing</option>
          <option value="ready">Ready</option>
          <option value="delivered">Delivered</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {orders.length === 0 ? (
        <p className="text-gray-500">No orders found.</p>
      ) : (
        orders.map((order) => (
          <div key={order.id} className="border p-4 mb-4 rounded shadow">
            <p className="font-semibold">Order ID: {order.id}</p>
            <p>Total Amount: £{order.totalAmount.toFixed(2)}</p>
            <p>
              Status: <strong>{order.status}</strong>
            </p>
            <p>Restaurant: {order.restaurant?.name}</p>
            <div className="mt-2">
              <button
                className="bg-blue-500 text-white px-4 py-1 rounded mr-2"
                onClick={() => setSelectedOrder(order)}
              >
                Details
              </button>
              <button
                className="bg-green-500 text-white px-4 py-1 rounded"
                onClick={() => handleRepeatOrder(order.id)}
              >
                Repeat Order
              </button>
            </div>
          </div>
        ))
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
  );
}
