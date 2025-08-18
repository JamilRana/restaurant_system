"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import OrderDetailModal from "@/components/Order/OrderDetailsModal";
import SearchBar from "@/components/Admin/SearchBar";
import Image from "next/image";
import DateRangePicker from "@/components/DateRangePicker";
import Pagination from "@/components/Pagination";
import { OrderStatus } from "@prisma/client";

// Status badge styles
const statusStyles: Record<OrderStatus, string> = {
  [OrderStatus.placed]: "bg-blue-100 text-blue-800",
  [OrderStatus.accepted]: "bg-green-100 text-green-800",
  [OrderStatus.preparing]: "bg-yellow-100 text-yellow-800",
  [OrderStatus.ready]: "bg-indigo-100 text-indigo-800",
  [OrderStatus.delivered]: "bg-gray-100 text-gray-800",
  [OrderStatus.rejected]: "bg-red-100 text-red-800",
};

// Type guard
function isValidOrderStatus(status: any): status is OrderStatus {
  return Object.values(OrderStatus).includes(status);
}

// Data types
type Food = { id: number; name: string };
type OrderItem = { id: number; quantity: number; price: number; food: Food };
type Customer = { id: number; name: string; email: string };
type Order = {
  id: number;
  status: string;
  totalAmount: number;
  createdAt: string;
  deliveryType: "DELIVERY" | "PICKUP";
  timeSlot?: string;
  customer: Customer;
  paymentMethod: string;
  paymentStatus: string;
  items: OrderItem[];
};

type DateRange = { startDate: Date | null; endDate: Date | null };

export default function AdminOrderList() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [totalCount, setTotalCount] = useState(0);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: null,
    endDate: null,
  });

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "ADMIN") {
      router.push("/login");
    }
  }, [session, status, router]);

  // Fetch orders
  const fetchOrders = async () => {
    if (status !== "authenticated" || !session?.user?.role) return;

    setLoading(true);
    try {
      let url = `/api/admin/orders?page=${page}&limit=10`;

      if (statusFilter) url += `&status=${encodeURIComponent(statusFilter)}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (dateRange.startDate)
        url += `&startDate=${dateRange.startDate.toISOString()}`;
      if (dateRange.endDate)
        url += `&endDate=${dateRange.endDate.toISOString()}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch orders");

      const data = await res.json();
      setTotalCount(data.totalCount);
      setOrders(data.orders);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, statusFilter, search, dateRange, status]);

  // WebSocket updates
  useEffect(() => {
    if (status !== "authenticated" || session?.user?.role !== "ADMIN") return;

    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    if (!dateRange.startDate && !dateRange.endDate) {
      setDateRange({
        startDate: startOfDay,
        endDate: endOfDay,
      });
    }
  }, [status]);

  // Print receipt
  const printOrderReceipt = (order: Order) => {
    const win = window.open("", "_blank");
    if (!win) {
      alert("Please allow popups to print receipts.");
      return;
    }

    const total = order.totalAmount.toFixed(2);
    const itemsHtml = order.items
      .map(
        (item) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px dashed #ccc;">${
          item.quantity
        }x</td>
        <td style="padding: 8px; border-bottom: 1px dashed #ccc;">${
          item.food.name
        }</td>
        <td style="padding: 8px; border-bottom: 1px dashed #ccc; text-align: right;">
          £${(item.price * item.quantity).toFixed(2)}
        </td>
      </tr>
    `
      )
      .join("");

    const deliveryType =
      order.deliveryType === "DELIVERY" ? "Delivery" : "Pickup";

    win.document.write(`
      <html>
        <head>
          <title>Order #${order.id}</title>
          <script>
            function printReceipt() {
              setTimeout(() => {
                window.print();
                window.close();
              }, 500);
            }
          </script>
        </head>
        <body onload="printReceipt()" style="font-family: monospace; width: 80mm; margin: 0 auto; padding: 10px;">
          <h3 style="text-align: center; margin-bottom: 5px;">TastyBites</h3>
          <p style="text-align: center; font-size: 0.8em; margin-top: 5px;">Order Receipt</p>
          <hr style="border: 1px dashed #000; margin: 10px 0;" />
          <p><strong>Order ID:</strong> ${order.id}</p>
          <p><strong>Time:</strong> ${new Date(
            order.createdAt
          ).toLocaleTimeString()}</p>
          <p><strong>Type:</strong> ${deliveryType}</p>
          ${
            order.timeSlot
              ? `<p><strong>Slot:</strong> ${order.timeSlot}</p>`
              : ""
          }
          <hr style="border: 1px dashed #000; margin: 15px 0;" />
          <table width="100%"><tbody>${itemsHtml}</tbody></table>
          <hr style="border: 1px dashed #000; margin: 15px 0;" />
          <p style="text-align: right; font-weight: bold;">Total: £${total}</p>
          <hr style="border: 1px dashed #000; margin: 15px 0;" />
          <p style="text-align: center; font-size: 0.7em;">Thank you for your order!</p>
        </body>
      </html>
    `);

    win.document.close();
  };

  // Handle status change
  const handleStatusChange = async (orderId: number, newStatus: string) => {
    if (!Object.values(OrderStatus).includes(newStatus as OrderStatus)) return;

    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error("Failed to update order");

      const updatedOrder: Order = await res.json();

      // Update state
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? updatedOrder : o))
      );
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(updatedOrder);
      }

      // Print receipt
      if (
        newStatus === OrderStatus.accepted ||
        newStatus === OrderStatus.delivered
      ) {
        printOrderReceipt(updatedOrder);
      }
    } catch (error: any) {
      console.error("Update failed:", error);
      alert(`Could not update order: ${error.message}`);
    }
  };

  const handleMarkAsPaid = async (orderId: number) => {
    if (!window.confirm("Mark this card payment as paid?")) return;

    try {
      const res = await fetch("/api/admin/orders/payment-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update payment status");
      }

      const updatedOrder = await res.json();

      // Update local state
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? updatedOrder : o))
      );

      if (selectedOrder?.id === orderId) {
        setSelectedOrder(updatedOrder);
      }

      alert("Payment status updated to 'Paid'");
    } catch (error: any) {
      console.error("Mark as paid failed:", error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleDateChange = (range: { startDate: Date; endDate: Date }) => {
    setDateRange({ startDate: range.startDate, endDate: range.endDate });
    setPage(1);
  }; // ✅ Reset all filters
  const resetFilters = () => {
    setSearch("");
    setStatusFilter("");
    setDateRange({ startDate: null, endDate: null });
    setPage(1);
  };

  // Summary cards
  const statusCounts = orders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const totalOrders = orders.length;
  const totalRevenue = orders
    .filter(
      (o) =>
        o.status === OrderStatus.delivered || o.status === OrderStatus.accepted
    )
    .reduce((sum, o) => sum + o.totalAmount, 0);

  if (status === "loading") {
    return <div className="p-4 text-center">Loading...</div>;
  }

  if (!session || session.user.role !== "ADMIN") {
    return null;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Manage Orders</h1>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2 mb-4">
        <div
          className={`p-4 rounded-lg shadow text-center cursor-pointer transition transform hover:scale-105 ${
            !statusFilter
              ? "bg-indigo-500 text-white"
              : "bg-gray-100 text-gray-800"
          }`}
          onClick={() => {
            setStatusFilter(""); // Reset filter
            setPage(1);
          }}
        >
          <p className="font-semibold text-sm">Total Orders</p>
          <p className="text-xl font-bold">{totalOrders}</p>
        </div>
        {Object.entries(OrderStatus).map(([key, value]) => {
          const count = statusCounts[value] || 0;
          return (
            <div
              key={value}
              className={`p-4 rounded-lg shadow text-center cursor-pointer transition transform hover:scale-105 ${statusStyles[value]}`}
              onClick={() => {
                setStatusFilter(value);
                setPage(1);
              }}
            >
              <p className="font-semibold">
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </p>
              <p className="text-lg font-bold">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 space-y-4">
        <div className="flex flex-wrap gap-2 mb-2">
          <button
            type="button"
            onClick={() => {
              const today = new Date();
              const start = new Date(today.setHours(0, 0, 0, 0));
              const end = new Date(today.setHours(23, 59, 59, 999));
              setDateRange({ startDate: start, endDate: end });
              setPage(1);
            }}
            className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => {
              setDateRange({ startDate: null, endDate: null });
              setPage(1);
            }}
            className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
          >
            All Time
          </button>

          {/* ✅ Reset All Filters Button */}
          <button
            type="button"
            onClick={resetFilters}
            className="text-xs px-3 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200 font-medium"
          >
            Reset Filters
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="md:w-1/2">
            <SearchBar
              onSearch={setSearch}
              placeholder="Search by ID, name..."
            />
          </div>
          <div>
            <DateRangePicker value={dateRange} onChange={handleDateChange} />
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500 text-center">Loading orders...</p>
      ) : orders.length === 0 ? (
        <p className="text-gray-500 text-center">No orders found.</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full table-auto border-collapse">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-4 py-3 text-left text-sm font-semibold">
                  Order ID
                </th>
                <th className="border px-4 py-3 text-left text-sm font-semibold">
                  Customer
                </th>
                <th className="border px-4 py-3 text-left text-sm font-semibold">
                  Time
                </th>
                <th className="border px-4 py-3 text-left text-sm font-semibold">
                  Total
                </th>
                <th className="border px-4 py-3 text-left text-sm font-semibold">
                  Status
                </th>
                <th className="border px-4 py-3 text-left text-sm font-semibold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const statusClass = isValidOrderStatus(order.status)
                  ? statusStyles[order.status]
                  : "bg-gray-100 text-gray-800";

                return (
                  <tr key={order.id} className="hover:bg-gray-50 transition">
                    <td className="border px-4 py-3 font-mono text-sm text-gray-700">
                      {String(order.id).slice(-6)}
                    </td>
                    <td className="border px-4 py-3 text-sm">
                      {order.customer?.name || "N/A"} <br key="br" />{" "}
                      {order.customer?.email || "N/A"} <br key="br4" />
                      <small>{order.deliveryType}</small>
                    </td>
                    <td className="border px-4 py-3 text-sm">
                      {" "}
                      {new Date(
                        order.createdAt
                      ).toUTCString()} <br key="br2" /> Slot: {order.timeSlot}{" "}
                    </td>
                    <td className="border px-4 py-3 text-sm">
                      £{order.totalAmount.toFixed(2)} <br key="br3" />{" "}
                      <b>{order.paymentMethod} </b> ({order.paymentStatus})
                    </td>
                    <td className="border px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${statusClass}`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="border px-4 py-3">
                      <div className="flex items-center gap-3">
                        <select
                          value={order.status}
                          onChange={(e) =>
                            handleStatusChange(order.id, e.target.value)
                          }
                          className="border rounded px-2 py-1 text-sm"
                        >
                          {Object.values(OrderStatus).map((status) => (
                            <option key={status} value={status}>
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </option>
                          ))}
                        </select>
                        {order.paymentStatus === "pending" && (
                          <button
                            onClick={() => handleMarkAsPaid(order.id)}
                            className="text-green-600 hover:text-green-800 text-sm font-medium flex items-center gap-1"
                            title="Mark this card payment as paid"
                          >
                            Paid
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Image
                            src="/icons/details.png"
                            alt="Details"
                            width={20}
                            height={20}
                          />
                        </button>
                        <button
                          onClick={() => printOrderReceipt(order)}
                          className="text-gray-600 hover:text-gray-800"
                        >
                          <Image
                            src="/icons/print.png"
                            alt="Print"
                            width={20}
                            height={20}
                          />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages && totalPages > 1 ? (
        <Pagination
          page={page}
          total={totalCount}
          limit={10}
          onPageChange={setPage}
        />
      ) : null}

      {/* Modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
}
