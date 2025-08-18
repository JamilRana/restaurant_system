"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect, useRouter } from "next/navigation";
import OrderDetailModal from "@/components/Order/OrderDetailsModal";

export default function OrderList() {
  const { data: session, status } = useSession();
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [totalPages, setTotalPages] = useState(1);

  const fetchOrders = async () => {
    try {
      const res = await fetch(
        `/api/orderlist?page=${page}&limit=5&status=${statusFilter}`
      );

      if (!res.ok) {
        console.error("Failed to fetch orders:", res.status);
        setOrders([]);
        setTotalPages(1);
        return;
      }

      const data = await res.json();

      // Safety check
      if (!Array.isArray(data.orders)) {
        console.warn("Unexpected response structure:", data);
        setOrders([]);
        setTotalPages(1);
        return;
      }

      setOrders(data.orders);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error("Failed to load orders", error);
      setOrders([]);
      setTotalPages(1);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchOrders();
    }
  }, [page, statusFilter]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  if (status === "loading") {
    return (
      <div className="p-4">
        <h2 className="text-2xl font-bold mb-4">My Orders</h2>
        {[1, 2, 3].map((i) => (
          <div key={i} className="border p-4 mb-4 rounded shadow animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }
  if (status !== "authenticated") redirect("/");

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">My Orders</h2>

      {/* Filter */}
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

      {/* Order Cards */}
      {orders.map((order) => (
        <div key={order.id} className="border p-4 mb-4 rounded shadow">
          <p className="font-semibold">Order ID: {order.id}</p>
          <p>Total Amount: ${order.totalAmount.toFixed(2)}</p>
          <p>Status: {order.status}</p>
          <p>Restaurant: {order.restaurant?.name}</p>

          {order.status !== "delivered" && order.status !== "rejected" ? (
            <div className="mt-2">
              <button
                className="bg-blue-500 text-white px-4 py-1 rounded mr-2"
                onClick={() => setSelectedOrder(order)}
              >
                Details
              </button>
              <button
                className="bg-blue-500 text-white px-4 py-1 rounded mr-2"
                onClick={() => setSelectedOrder(order)}
              >
                Status
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-500 mt-2">Completed</p>
          )}
        </div>
      ))}

      {/* Pagination */}
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

      {/* Order Modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
}
