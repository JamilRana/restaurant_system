"use client";
import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import OrderDetailModal from "@/components/Order/OrderDetailsModal";
import SearchBar from "@/components/Admin/SearchBar";
import Image from "next/image";
import DateRangePicker from "@/components/DateRangePicker";
import Pagination from "@/components/Pagination";
import { OrderStatus, PaymentMethod, PaymentStatus } from "@prisma/client";
import { RouteLoader } from "@/components/RouteLoader";
import toast from "react-hot-toast";

// Status badge styles
const statusStyles: Record<OrderStatus, string> = {
  [OrderStatus.PLACED]: "bg-blue-50 text-blue-700 border border-blue-200",
  [OrderStatus.ACCEPTED]: "bg-green-50 text-green-700 border border-green-200",
  [OrderStatus.PREPARING]:
    "bg-yellow-50 text-yellow-700 border border-yellow-200",
  [OrderStatus.READY]: "bg-indigo-50 text-indigo-700 border border-indigo-200",
  [OrderStatus.DELIVERED]: "bg-gray-50 text-gray-700 border border-gray-200",
  [OrderStatus.REJECTED]: "bg-red-50 text-red-700 border border-red-200",
};

// Payment status styles
const paymentStatusStyles: Record<PaymentStatus, string> = {
  [PaymentStatus.PENDING]: "bg-yellow-100 text-yellow-800",
  [PaymentStatus.PAID]: "bg-green-100 text-green-800",
  [PaymentStatus.FAILED]: "bg-red-100 text-red-800",
  [PaymentStatus.REFUNDED]: "bg-purple-100 text-purple-800",
};

// Type guard
function isValidOrderStatus(status: any): status is OrderStatus {
  return Object.values(OrderStatus).includes(status);
}

// Data types
type FoodOption = { id: number; name: string; price: number };
type Food = { id: number; name: string; options: FoodOption[] };
type OrderItem = {
  id: number;
  quantity: number;
  price: number;
  food: Food;
  foodOptionId: number | null;
  foodOption: FoodOption | null;
};
type Customer = { id: number; name: string; email: string };
type Order = {
  id: number;
  status: OrderStatus;
  totalAmount: number;
  finalAmount: number;
  createdAt: string;
  deliveryType: "DELIVERY" | "PICKUP" | "DINEIN";
  timeSlot?: string;
  customer: Customer;
  paymentMethod: PaymentMethod | null;
  paymentStatus: PaymentStatus;
  items: OrderItem[];
  currentTableFor: { number: string } | null;
  // For cash payment
  cashGiven?: number | null;
};

type DateRange = { startDate: Date | null; endDate: Date | null };

export default function AdminOrderList() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Audio notification
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const notificationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isNotificationEnabled, setIsNotificationEnabled] = useState(true);

  const isNotificationEnabledRef = useRef(isNotificationEnabled);

  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [foods, setFoods] = useState<Food[]>([]);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [activePreset, setActivePreset] = useState<"today" | "all" | null>(
    null
  );
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: null,
    endDate: null,
  });
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Add Item State
  const [showAddItem, setShowAddItem] = useState<number | null>(null);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [option, setOption] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [searchFood, setSearchFood] = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Cash payment state
  const [cashGiven, setCashGiven] = useState<string>("");

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Initialize audio
  useEffect(() => {
    isNotificationEnabledRef.current = isNotificationEnabled;
  }, [isNotificationEnabled]);
  useEffect(() => {
    if (typeof window !== "undefined") {
      audioRef.current = new Audio("/sounds/notification.mp3");
      audioRef.current.volume = 0.7;
    }
  }, []);
  // Play notification sound
  const playNotification = () => {
    if (!isNotificationEnabledRef.current || !audioRef.current) return;
    try {
      audioRef.current.currentTime = 0;
      audioRef.current
        .play()
        .catch((e) => console.log("Audio play failed:", e));
    } catch (e) {
      console.log("Audio error:", e);
    }
  };

  // Toggle notification state
  const toggleNotification = () => {
    const newState = !isNotificationEnabled;
    setIsNotificationEnabled(newState);

    // Stop any ongoing playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    // Clear any pending intervals
    if (notificationIntervalRef.current) {
      clearInterval(notificationIntervalRef.current);
      notificationIntervalRef.current = null;
    }

    // Save to localStorage so it persists
    localStorage.setItem("notificationsEnabled", String(newState));
  };

  // Load saved preference on mount
  useEffect(() => {
    const saved = localStorage.getItem("notificationsEnabled");
    if (saved !== null) {
      setIsNotificationEnabled(saved === "true");
    }
  }, []);

  // Redirect if not admin
  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "ADMIN") {
      router.push("/auth");
    }
  }, [session, status, router]);

  // Set today's date range
  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "ADMIN") return;
    const today = new Date();
    setDateRange({
      startDate: new Date(today.setHours(0, 0, 0, 0)),
      endDate: new Date(today.setHours(23, 59, 59, 999)),
    });
    setActivePreset("today");
    setIsInitialLoad(false);
  }, [session, status]);

  // Fetch orders
  const fetchOrders = async () => {
    if (status !== "authenticated" || isInitialLoad) return;
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
      setOrders(data.orders);
      setTotalPages(data.totalPages);
      setTotalCount(data.totalCount);
      setStatusCounts(data.statusDistribution);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  // Fetch foods for add item
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
    fetchOrders();
  }, [page, statusFilter, dateRange, status, isInitialLoad]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setPage(1);
      fetchOrders();
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [search]);

  // Real-time updates with Pusher
  useEffect(() => {
    if (status !== "authenticated" || session?.user.role !== "ADMIN") return;

    const Pusher = require("pusher-js");
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      useTLS: true,
    });

    const channel = pusher.subscribe(`restaurant-${session.user.restaurantId}`);

    // Handle new orders
    channel.bind("order-created", (newOrder: Order) => {
      setOrders((prev) => [newOrder, ...prev]);
      setTodayCount((c) => c + 1);
      playNotification(); // Play sound for new orders
      toast.success(`New order #${newOrder.id} created!`, {
        duration: 5000,
        icon: "🔔",
      });
    });

    // Handle order updates
    channel.bind("order-updated", (updatedOrder: Order) => {
      setOrders((prev) =>
        prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
      );
      if (selectedOrder?.id === updatedOrder.id) setSelectedOrder(updatedOrder);
      toast.success(`Order #${updatedOrder.id} → ${updatedOrder.status}`);
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, [session, selectedOrder?.id, status, isNotificationEnabled]);

  // Load foods once
  useEffect(() => {
    if (status === "authenticated" && session?.user.role === "ADMIN") {
      fetchFoods();
    }
  }, [status, session]);

  // Print receipt
  const printOrderReceipt = (order: Order) => {
    const win = window.open("", "_blank");
    if (!win) {
      alert("Please allow popups to print receipts.");
      return;
    }

    const itemsHtml = order.items
      .map(
        (item) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px dashed #ccc;">${
          item.quantity
        }x</td>
        <td style="padding: 8px; border-bottom: 1px dashed #ccc;">
          ${item.food.name}
          ${item.foodOption ? ` (+${item.foodOption.name})` : ""}
        </td>
        <td style="text-align: right; padding: 8px; border-bottom: 1px dashed #ccc;">£${
          item.price * item.quantity
        }</td>
      </tr>
    `
      )
      .join("");

    win.document.write(`
      <html>
        <head>
          <title>Order #${order.id}</title>
          <script>function printReceipt(){setTimeout(()=>{window.print();window.close();},500);}</script>
        </head>
        <body onload="printReceipt()" style="font-family: monospace; width: 80mm; margin: 0 auto; padding: 10px;">
          <h3 style="text-align:center;margin:5px 0;">TastyBites</h3>
          <p style="text-align:center;font-size:0.8em;margin:5px 0;">Order Receipt</p>
          <hr style="border:1px dashed #000;margin:10px 0;" />
          <p><strong>ID:</strong> ${order.id}</p>
          <p><strong>Time:</strong> ${new Date(
            order.createdAt
          ).toLocaleTimeString()}</p>
          <p><strong>Type:</strong> ${order.deliveryType}</p>
          ${
            order.timeSlot
              ? `<p><strong>Slot:</strong> ${order.timeSlot}</p>`
              : ""
          }
          ${
            order.currentTableFor
              ? `<p><strong>Table:</strong> ${order.currentTableFor.number}</p>`
              : ""
          }
          <hr style="border:1px dashed #000;margin:15px 0;" />
          <table width="100%"><tbody>${itemsHtml}</tbody></table>
          <hr style="border:1px dashed #000;margin:15px 0;" />
          <p style="text-align:right;font-weight:bold;">Total: £${
            order.finalAmount
          }</p>
          ${
            order.paymentMethod === "CASH" && order.cashGiven
              ? `<p style="text-align:right;">Cash Given: £${
                  order.cashGiven
                }</p>
             <p style="text-align:right;font-weight:bold;">Change: £${
               order.cashGiven - order.finalAmount
             }</p>`
              : ""
          }
          <hr style="border:1px dashed #000;margin:15px 0;" />
          <p style="text-align:center;font-size:0.7em;">Thank you!</p>
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

      if (!res.ok) throw new Error("Failed to update");
      const updatedOrder: Order = await res.json();

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? updatedOrder : o))
      );
      if (selectedOrder?.id === orderId) setSelectedOrder(updatedOrder);

      if (
        newStatus === OrderStatus.ACCEPTED ||
        newStatus === OrderStatus.DELIVERED
      ) {
        printOrderReceipt(updatedOrder);
      }

      toast.success(`Order #${orderId} updated`);
    } catch (error: any) {
      toast.error("Update failed");
    }
  };

  // Mark as paid with cash handling
  const handleMarkAsPaid = async (orderId: number) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    // For cash payments, get cash amount
    if (order.paymentMethod === "CASH") {
      const cash = prompt(
        "Enter cash given (£):",
        order.finalAmount.toString()
      );
      if (!cash) return;

      const cashNum = parseFloat(cash);
      if (isNaN(cashNum) || cashNum < order.finalAmount) {
        toast.error("Cash amount must be at least the order total");
        return;
      }

      setCashGiven(cash);
    }

    try {
      const payload: any = { paymentMethod: order.paymentMethod || "CARD" };
      if (order.paymentMethod === "CASH" && cashGiven) {
        payload.cashGiven = parseFloat(cashGiven);
      }

      const res = await fetch(`/api/admin/orders/${orderId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to update");
      const updatedOrder = await res.json();

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? updatedOrder : o))
      );
      if (selectedOrder?.id === orderId) setSelectedOrder(updatedOrder);

      toast.success("Payment marked as paid");
    } catch (error: any) {
      toast.error("Error updating payment");
    }
  };

  // Add item to order
  const addItemToOrder = async (orderId: number) => {
    if (!selectedFood) return;
    setActionLoading(orderId);

    try {
      const res = await fetch("/api/admin/orders/add-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          foodId: selectedFood.id,
          quantity,
          foodOptionId: option,
          notes: notes || "",
        }),
      });

      if (res.ok) {
        const updatedOrder = await res.json();
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? updatedOrder : o))
        );
        if (selectedOrder?.id === orderId) setSelectedOrder(updatedOrder);

        // Reset form
        setShowAddItem(null);
        setSelectedFood(null);
        setQuantity(1);
        setOption(null);
        setNotes("");
        setSearchFood("");
        toast.success("Item added to order");
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to add item");
      }
    } catch (err) {
      console.error("Add item failed:", err);
      toast.error("Add item failed");
    } finally {
      setActionLoading(null);
    }
  };

  // Delete item from order
  const deleteItemFromOrder = async (orderId: number, itemId: number) => {
    if (!confirm("Remove this item?")) return;
    setActionLoading(orderId);

    try {
      const res = await fetch(`/api/admin/orders/add-item/${itemId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        const updatedOrder = await res.json();
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? updatedOrder : o))
        );
        if (selectedOrder?.id === orderId) setSelectedOrder(updatedOrder);
        toast.success("Item removed");
      } else {
        toast.error("Failed to remove item");
      }
    } catch (err) {
      console.error("Delete item failed:", err);
      toast.error("Delete item failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDateChange = (range: { startDate: Date; endDate: Date }) => {
    if (range.startDate && range.endDate && range.startDate > range.endDate) {
      toast.error("Start date cannot be after end date");
      return;
    }
    setDateRange(range);
    setPage(1);
    setActivePreset(null);
  };

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("");
    setDateRange({ startDate: null, endDate: null });
    setPage(1);
    setActivePreset(null);
  };

  // Summary stats
  const totalOrders = totalCount;
  const totalRevenue = orders
    .filter(
      (o) =>
        o.status === OrderStatus.DELIVERED || o.status === OrderStatus.ACCEPTED
    )
    .reduce((sum, o) => sum + o.finalAmount, 0);

  // Today count state
  const [todayCount, setTodayCount] = useState(0);

  if (status === "loading") return <RouteLoader />;
  if (!session || session.user.role !== "ADMIN") return null;

  // Filter foods for search
  const filteredFoods = foods.filter((food) =>
    food.name.toLowerCase().includes(searchFood.toLowerCase())
  );

  // Calculate cash return
  const calculateReturn = (order: Order) => {
    if (order.paymentMethod !== "CASH" || !order.cashGiven) return 0;
    return order.cashGiven - order.finalAmount;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6">
      <div className="max-w-3xl md:max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-2">
              Orders
            </h1>
            <p className="text-slate-600">Manage your restaurant orders</p>
          </div>
          <div className="flex items-center gap-3 mt-4 md:mt-0">
            <button
              onClick={toggleNotification}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                isNotificationEnabled
                  ? "bg-green-500 text-white"
                  : "bg-gray-300 text-gray-700"
              }`}
            >
              {isNotificationEnabled
                ? "🔊 Notifications ON"
                : "🔇 Notifications OFF"}
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2 mb-4">
          <div
            onClick={() => {
              setStatusFilter("");
              setPage(1);
            }}
            className={`p-5 rounded-2xl cursor-pointer transition-all duration-200 transform hover:scale-105 ${
              !statusFilter
                ? "bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg"
                : "bg-white/80 backdrop-blur-sm border border-slate-200 shadow-sm"
            }`}
          >
            <div className="flex flex-col">
              <p className="text-sm font-medium opacity-90">Total Orders</p>
              <p className="text-2xl font-bold mt-1">{totalOrders}</p>
            </div>
          </div>

          {Object.entries(OrderStatus).map(([key, value]) => {
            const count = statusCounts[value] || 0;
            return (
              <div
                key={value}
                onClick={() => {
                  setStatusFilter(value);
                  setPage(1);
                }}
                className={`p-5 rounded-2xl cursor-pointer transition-all duration-200 transform hover:scale-105 ${statusStyles[value]} bg-white/80 backdrop-blur-sm border`}
              >
                <div className="flex flex-col">
                  <p className="text-sm font-medium capitalize">{key}</p>
                  <p className="text-2xl font-bold mt-1">{count}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-sm mb-8 p-5">
          <div className="flex flex-wrap gap-3 mb-6">
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                setDateRange({
                  startDate: new Date(today.setHours(0, 0, 0, 0)),
                  endDate: new Date(today.setHours(23, 59, 59, 999)),
                });
                setPage(1);
                setActivePreset("today");
              }}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                activePreset === "today"
                  ? "bg-blue-500 text-white shadow-md"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Today
            </button>

            <button
              type="button"
              onClick={() => {
                setDateRange({ startDate: null, endDate: null });
                setPage(1);
                setActivePreset("all");
              }}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                activePreset === "all"
                  ? "bg-slate-500 text-white shadow-md"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              All Time
            </button>

            <button
              onClick={resetFilters}
              className="px-4 py-2 text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition-all"
            >
              Reset
            </button>

            {/* Active Filters */}
            {search && (
              <div className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full flex items-center gap-2">
                <span>Search: {search}</span>
                <button
                  onClick={() => setSearch("")}
                  className="w-5 h-5 flex items-center justify-center rounded-full bg-green-200 hover:bg-green-300"
                >
                  ×
                </button>
              </div>
            )}
            {statusFilter && (
              <div className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full flex items-center gap-2">
                <span>Status: {statusFilter}</span>
                <button
                  onClick={() => setStatusFilter("")}
                  className="w-5 h-5 flex items-center justify-center rounded-full bg-blue-200 hover:bg-blue-300"
                >
                  ×
                </button>
              </div>
            )}
            <div className="w-full md:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full md:w-48 px-4 py-2.5 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Statuses</option>
                {Object.values(OrderStatus).map((status) => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-2 items-start md:items-center">
            <div className="relative flex-1 min-w-0">
              <SearchBar
                onSearch={setSearch}
                placeholder="Search by ID, name, email..."
                defaultValue={search}
              />
            </div>
            <div className="flex-1 md:min-w-0">
              <DateRangePicker value={dateRange} onChange={handleDateChange} />
            </div>
          </div>
        </div>

        {/* Orders Display */}
        <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
              <p className="mt-4 text-slate-600">Loading orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 text-slate-300">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
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
              </div>
              <h3 className="text-lg font-medium text-slate-700 mb-2">
                No orders found
              </h3>
              <p className="text-slate-500">
                Try adjusting your search or filter criteria
              </p>
            </div>
          ) : isMobile ? (
            /* Mobile: Card Layout */
            <div className="divide-y divide-slate-200">
              {orders.map((order) => {
                const statusClass = isValidOrderStatus(order.status)
                  ? statusStyles[order.status]
                  : "bg-slate-50 text-slate-700 border border-slate-200";
                const paymentClass = paymentStatusStyles[order.paymentStatus];
                const returnAmount = calculateReturn(order);

                return (
                  <div
                    key={order.id}
                    className="p-5 hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-mono font-bold text-slate-900 text-lg">
                          #{String(order.id).slice(-6)}
                        </div>
                        <div className="text-slate-500 text-sm">
                          {order.customer?.name || "N/A"}
                        </div>
                        {order.currentTableFor && (
                          <div className="text-blue-600 text-sm font-medium">
                            Table {order.currentTableFor.number}
                          </div>
                        )}
                      </div>
                      <div
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${statusClass}`}
                      >
                        {order.status}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <div className="text-xs text-slate-500">Time</div>
                        <div className="font-medium">
                          {new Date(order.createdAt).toLocaleString(undefined, {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Total</div>
                        <div className="font-bold text-slate-900">
                          £{order.finalAmount}
                        </div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="text-xs text-slate-500">Payment</div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {order.paymentMethod || "N/A"}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${paymentClass}`}
                        >
                          {order.paymentStatus}
                        </span>
                        {order.paymentMethod === "CASH" && order.cashGiven && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                            Change: £{returnAmount}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-3">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          order.deliveryType === "DELIVERY"
                            ? "bg-red-100 text-red-800 border border-red-200"
                            : order.deliveryType === "DINEIN"
                            ? "bg-blue-100 text-blue-800 border border-blue-200"
                            : "bg-green-100 text-green-800 border border-green-200"
                        }`}
                      >
                        {order.deliveryType}
                      </span>
                      {order.deliveryType === "DINEIN" && (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full">
                          <p className="text-blue-600 font-medium">
                            Table {order.currentTableFor?.number || "?"}
                          </p>
                        </span>
                      )}

                      <div className="flex items-center gap-2">
                        <select
                          value={order.status}
                          onChange={(e) =>
                            handleStatusChange(order.id, e.target.value)
                          }
                          className={`rounded-lg px-2 py-1 text-xs border focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${statusClass}`}
                        >
                          {Object.values(OrderStatus).map((status) => (
                            <option key={status} value={status}>
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="text-blue-600 hover:text-blue-800 p-1.5 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <Image
                            src="/icons/details.png"
                            alt="Details"
                            width={16}
                            height={16}
                          />
                        </button>
                        <button
                          onClick={() => printOrderReceipt(order)}
                          className="text-slate-600 hover:text-slate-800 p-1.5 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <Image
                            src="/icons/print.png"
                            alt="Print"
                            width={16}
                            height={16}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Items Summary
                    <div className="mb-3 max-h-24 overflow-y-auto bg-slate-50 p-2 rounded">
                      {order.items.length === 0 ? (
                        <p className="text-slate-400 italic text-xs py-1">
                          No items
                        </p>
                      ) : (
                        <ul className="space-y-1">
                          {order.items.map((item) => (
                            <li
                              key={item.id}
                              className="flex justify-between text-xs"
                            >
                              <div className="font-medium">
                                {item.quantity}x {item.food.name}
                                {item.foodOption && (
                                  <span className="text-blue-600 ml-1">
                                    (+{item.foodOption.name})
                                  </span>
                                )}
                              </div>
                              <span className="font-bold text-green-700">
                                £{item.price * item.quantity}
                              </span>
                              {order.deliveryType === "DINEIN" && (
                                <button
                                  onClick={() =>
                                    deleteItemFromOrder(order.id, item.id)
                                  }
                                  className="text-red-600 hover:text-red-800 ml-2"
                                >
                                  ×
                                </button>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                     */}

                    {/* Action Buttons */}
                    <div className="space-y-2">
                      {order.deliveryType === "DINEIN" &&
                        order.status === "DELIVERED" && (
                          <button
                            onClick={() =>
                              setShowAddItem(
                                showAddItem === order.id ? null : order.id
                              )
                            }
                            disabled={actionLoading === order.id}
                            className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-70 transition"
                          >
                            {showAddItem === order.id
                              ? "Cancel Add"
                              : "+ Add Item"}
                          </button>
                        )}
                      {/* {order.paymentStatus !== PaymentStatus.PAID && (
                        <button
                          onClick={() => handleMarkAsPaid(order.id)}
                          className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition"
                        >
                          Mark as Paid
                        </button>
                      )} */}
                    </div>

                    {/* Add Item Form */}
                    {showAddItem === order.id && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
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
                                <p className="p-2 text-gray-500 text-sm">
                                  No food found
                                </p>
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
                                    <div className="font-medium">
                                      {food.name}
                                    </div>
                                    <div className="text-xs text-gray-600">
                                      {food.options.length > 0
                                        ? food.options
                                            .map((opt) => `+${opt.name}`)
                                            .join(", ")
                                        : "No options"}
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <strong className="text-sm">
                                {selectedFood.name}
                              </strong>
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
                                  setOption(
                                    e.target.value
                                      ? Number(e.target.value)
                                      : null
                                  )
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
                                onClick={() => addItemToOrder(order.id)}
                                disabled={actionLoading === order.id}
                                className="flex-1 bg-green-600 text-white p-2 rounded font-medium hover:bg-green-700 disabled:bg-gray-400 text-sm"
                              >
                                {actionLoading === order.id
                                  ? "Adding..."
                                  : "Add to Order"}
                              </button>
                              <button
                                onClick={() => setShowAddItem(null)}
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
              })}
            </div>
          ) : (
            /* Desktop: Table with Add Item */
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Order
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {orders.map((order) => {
                    const statusClass = isValidOrderStatus(order.status)
                      ? statusStyles[order.status]
                      : "bg-slate-50 text-slate-700 border border-slate-200";
                    const paymentClass =
                      paymentStatusStyles[order.paymentStatus];
                    const returnAmount = calculateReturn(order);

                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="font-mono font-bold text-slate-900">
                            #{String(order.id).slice(-6)}
                          </div>
                          {order.currentTableFor && (
                            <div className="text-blue-600 text-sm">
                              Table {order.currentTableFor.number}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-5">
                          <div className="font-medium text-slate-900">
                            {order.customer?.name || "N/A"}
                          </div>
                          <div className="text-slate-500 truncate max-w-xs">
                            {order.customer?.email}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="text-slate-900">
                            {new Date(order.createdAt).toLocaleString(
                              undefined,
                              { dateStyle: "short", timeStyle: "short" }
                            )}
                          </div>
                          {order.timeSlot && (
                            <div className="text-xs text-slate-500 mt-1">
                              Slot: {order.timeSlot}
                            </div>
                          )}
                          {/* <div
                            className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${statusClass} mt-2`}
                          >
                            {order.status}
                          </div> */}
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              order.deliveryType === "DELIVERY"
                                ? "bg-red-100 text-red-800 border border-red-200"
                                : order.deliveryType === "DINEIN"
                                ? "bg-blue-100 text-blue-800 border border-blue-200"
                                : "bg-green-100 text-green-800 border border-green-200"
                            }`}
                          >
                            {order.deliveryType}
                          </span>
                          {order.currentTableFor?.number && (
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full">
                              <p className="text-blue-600 font-medium">
                                Table {order.currentTableFor?.number}
                              </p>
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-5">
                          <div className="font-bold text-slate-900">
                            £{order.finalAmount}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            <span className="mr-2">
                              {order.paymentMethod || "N/A"}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-xs ${paymentClass}`}
                            >
                              {order.paymentStatus}
                            </span>
                            {order.paymentMethod === "CASH" &&
                              order.cashGiven && (
                                <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                                  Change: £{returnAmount}
                                </span>
                              )}
                          </div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="flex flex-col sm:flex-row gap-2 items-center">
                            <select
                              value={order.status}
                              onChange={(e) =>
                                handleStatusChange(order.id, e.target.value)
                              }
                              className={`rounded-lg px-2 py-1 text-xs border focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all ${statusClass}`}
                            >
                              {Object.values(OrderStatus).map((status) => (
                                <option key={status} value={status}>
                                  {status.charAt(0).toUpperCase() +
                                    status.slice(1)}
                                </option>
                              ))}
                            </select>
                            {order.deliveryType === "DINEIN" &&
                              order.status !== "DELIVERED" && (
                                <button
                                  onClick={() =>
                                    setShowAddItem(
                                      showAddItem === order.id ? null : order.id
                                    )
                                  }
                                  disabled={actionLoading === order.id}
                                  className="text-blue-600 hover:text-blue-800 text-xs font-medium px-3 py-1.5 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors whitespace-nowrap"
                                >
                                  {showAddItem === order.id
                                    ? "Cancel"
                                    : "+ Add Item"}
                                </button>
                              )}
                            {/* {order.paymentStatus !== PaymentStatus.PAID && (
                              <button
                                onClick={() => handleMarkAsPaid(order.id)}
                                className="text-green-600 hover:text-green-800 text-xs font-medium px-3 py-1.5 bg-green-50 rounded-lg hover:bg-green-100 transition-colors whitespace-nowrap"
                              >
                                Mark Paid
                              </button>
                            )} */}
                            <div className="flex gap-2">
                              <button
                                onClick={() => setSelectedOrder(order)}
                                className="text-blue-600 hover:text-blue-800 p-1.5 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                              >
                                <Image
                                  src="/icons/details.png"
                                  alt="Details"
                                  width={16}
                                  height={16}
                                />
                              </button>
                              <button
                                onClick={() => printOrderReceipt(order)}
                                className="text-slate-600 hover:text-slate-800 p-1.5 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                              >
                                <Image
                                  src="/icons/print.png"
                                  alt="Print"
                                  width={16}
                                  height={16}
                                />
                              </button>
                            </div>
                          </div>

                          {/* Items List for Dine-in 
                          {order.deliveryType === "DINEIN" && (
                            <div className="mt-2 max-h-24 overflow-y-auto text-xs">
                              {order.items.map((item) => (
                                <div
                                  key={item.id}
                                  className="flex justify-between py-1"
                                >
                                  <span>
                                    {item.quantity}x {item.food.name}
                                    {item.foodOption && (
                                      <span className="text-blue-600">
                                        {" "}
                                        (+{item.foodOption.name})
                                      </span>
                                    )}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">
                                      £{item.price * item.quantity}
                                    </span>
                                    <button
                                      onClick={() =>
                                        deleteItemFromOrder(order.id, item.id)
                                      }
                                      className="text-red-600 hover:text-red-800"
                                    >
                                      ×
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}*/}

                          {/* Add Item Form (Desktop) */}
                          {showAddItem === order.id && (
                            <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200 max-w-xs">
                              {!selectedFood ? (
                                <>
                                  <input
                                    type="text"
                                    value={searchFood}
                                    onChange={(e) =>
                                      setSearchFood(e.target.value)
                                    }
                                    placeholder="Search food..."
                                    className="w-full border border-blue-300 p-2 rounded text-sm mb-2"
                                    autoFocus
                                  />
                                  <div className="max-h-40 overflow-y-auto border border-blue-200 rounded">
                                    {filteredFoods.length === 0 ? (
                                      <p className="p-2 text-gray-500 text-sm">
                                        No food found
                                      </p>
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
                                          <div className="font-medium">
                                            {food.name}
                                          </div>
                                          <div className="text-xs text-gray-600">
                                            {food.options.length > 0
                                              ? food.options
                                                  .map((opt) => `+${opt.name}`)
                                                  .join(", ")
                                              : "No options"}
                                          </div>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </>
                              ) : (
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center">
                                    <strong className="text-sm">
                                      {selectedFood.name}
                                    </strong>
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
                                        setOption(
                                          e.target.value
                                            ? Number(e.target.value)
                                            : null
                                        )
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
                                      setQuantity(
                                        Math.max(1, Number(e.target.value))
                                      )
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
                                      onClick={() => addItemToOrder(order.id)}
                                      disabled={actionLoading === order.id}
                                      className="flex-1 bg-green-600 text-white p-2 rounded font-medium hover:bg-green-700 disabled:bg-gray-400 text-sm"
                                    >
                                      {actionLoading === order.id
                                        ? "Adding..."
                                        : "Add"}
                                    </button>
                                    <button
                                      onClick={() => setShowAddItem(null)}
                                      className="px-3 py-2 bg-gray-300 rounded font-medium hover:bg-gray-400 text-sm"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center">
            <Pagination
              page={page}
              total={totalCount}
              limit={10}
              onPageChange={setPage}
            />
          </div>
        )}

        {/* Modal */}
        {selectedOrder && (
          <OrderDetailModal
            order={selectedOrder}
            onClose={() => setSelectedOrder(null)}
            onUpdate={(updatedOrder) => {
              setOrders((prev) =>
                prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
              );
            }}
          />
        )}
      </div>
    </div>
  );
}
