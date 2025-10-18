// components/OrderDetailsModal.tsx
import { Customer } from "@/types";
import { OrderStatus, PaymentMethod, PaymentStatus } from "@prisma/client";
import React, { useState } from "react";
import toast from "react-hot-toast";

interface OrderDetailsModalProps {
  order: any;
  onClose: () => void;
  onUpdate?: (updatedOrder: any) => void;
}

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
  currentTableFor: { id: number; number: string } | null;
  cashGiven?: number | null;
  address?: string;
  postcode?: string;
  orderNote?: string;
};

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  order,
  onClose,
  onUpdate,
}) => {
  // ✅ FIXED: Removed unused state variables
  const [cashGiven, setCashGiven] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"CARD" | "CASH">("CARD");
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Status badge color mapping
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "placed":
        return "bg-blue-100 text-blue-800";
      case "accepted":
        return "bg-green-100 text-green-800";
      case "preparing":
        return "bg-yellow-100 text-yellow-800";
      case "ready":
        return "bg-indigo-100 text-indigo-800";
      case "delivered":
        return "bg-gray-100 text-gray-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Calculate cash return
  const calculateReturn = () => {
    if (!cashGiven) return 0;
    const cash = parseFloat(cashGiven);
    return cash - order.finalAmount;
  };

  const isCashShort = () => {
    if (!cashGiven) return false;
    const cash = parseFloat(cashGiven);
    return cash < order.finalAmount;
  };

  // Handle payment update
  const handleMarkAsPaid = async () => {
    if (paymentMethod === "CASH" && (!cashGiven || isCashShort())) {
      setError("Please enter sufficient cash amount");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const payload: any = { paymentMethod };
      if (paymentMethod === "CASH") {
        payload.cashGiven = parseFloat(cashGiven);
      }

      const res = await fetch(`/api/admin/orders/${order.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update payment");
      }

      const updatedOrder = await res.json();
      onUpdate?.(updatedOrder);
      onClose();
    } catch (err: any) {
      setError(err.message || "Payment update failed");
    } finally {
      setIsProcessing(false);
    }
  };

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

  // Check if order can be updated
  const canUpdate = order.status !== "DELIVERED" && order.status !== "REJECTED";

  // ✅ FIXED: Removed delete item functionality (should be in main dashboard)
  // Delete items should be handled in the main order list, not details modal

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white/95 backdrop-blur-sm border border-white/30 rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col transform transition-all duration-300 scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-gray-200/50">
          <div className="flex justify-between items-start">
            <h3 className="text-2xl font-bold text-gray-800">Order Details</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600 hover:text-gray-800 transition-colors"
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">#{order.id}</p>
          {order.currentTableFor && (
            <p className="text-sm text-blue-600 mt-1">
              Table {order.currentTableFor.number}
            </p>
          )}
        </div>

        {/* Scrollable Body */}
        <div className="p-6 pt-4 flex-1 overflow-y-auto space-y-5">
          {/* Status */}
          <div>
            <strong className="text-gray-700 text-sm uppercase tracking-wide">
              Status
            </strong>
            <span
              className={`ml-2 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                order.status
              )}`}
            >
              {order.status}
            </span>
          </div>

          {/* Payment Info */}
          <div>
            <strong className="text-gray-700 text-sm uppercase tracking-wide">
              Payment
            </strong>
            <div className="mt-2 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Method:</span>
                <span className="font-medium">
                  {order.paymentMethod || "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span
                  className={`px-2 py-1 rounded text-sm font-medium ${
                    order.paymentStatus === "PAID"
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {order.paymentStatus}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total:</span>
                <span className="font-bold text-gray-900">
                  £{order.finalAmount}
                </span>
              </div>
              {order.paymentMethod === "CASH" && order.cashGiven && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cash Given:</span>
                    <span className="font-medium text-gray-900">
                      £{order.cashGiven}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Change:</span>
                    <span className="font-bold text-green-700">
                      £{order.cashGiven - order.finalAmount}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Payment Actions (only for unpaid orders) */}
          {order.paymentStatus !== "PAID" && canUpdate && (
            <div className="pt-4 border-t border-gray-200">
              <strong className="text-gray-700 block mb-3">Mark as Paid</strong>

              {error && (
                <div className="mb-3 p-2 bg-red-100 text-red-800 text-sm rounded">
                  {error}
                </div>
              )}

              {/* Payment Method Selection */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("CARD")}
                  disabled={isProcessing}
                  className={`py-2.5 text-sm rounded-lg font-medium transition ${
                    paymentMethod === "CARD"
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-gray-200 hover:bg-gray-300 text-gray-800"
                  }`}
                >
                  Card
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("CASH")}
                  disabled={isProcessing}
                  className={`py-2.5 text-sm rounded-lg font-medium transition ${
                    paymentMethod === "CASH"
                      ? "bg-green-600 text-white shadow-md"
                      : "bg-gray-200 hover:bg-gray-300 text-gray-800"
                  }`}
                >
                  Cash
                </button>
              </div>

              {/* Cash Input (only for cash payments) */}
              {paymentMethod === "CASH" && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cash Given (£)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={cashGiven}
                    onChange={(e) => setCashGiven(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Enter cash amount"
                  />
                  {cashGiven && (
                    <div
                      className={`mt-2 p-2 rounded text-sm font-medium ${
                        isCashShort()
                          ? "bg-red-100 text-red-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {isCashShort()
                        ? `Insufficient: Short by £${Math.abs(
                            calculateReturn()
                          )}`
                        : `Change: £${calculateReturn()}`}
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleMarkAsPaid}
                disabled={
                  isProcessing ||
                  (paymentMethod === "CASH" && (!cashGiven || isCashShort()))
                }
                className="w-full mt-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-70 transition"
              >
                {isProcessing ? "Processing..." : "Mark as Paid"}
              </button>
            </div>
          )}

          {/* Delivery Type */}
          <div>
            <strong className="text-gray-700 text-sm uppercase tracking-wide">
              Type
            </strong>{" "}
            <span className="text-gray-600 ml-1">{order.deliveryType}</span>
          </div>

          {/* Time Slot */}
          {order.timeSlot && (
            <div>
              <strong className="text-gray-700 text-sm uppercase tracking-wide">
                Time Slot
              </strong>{" "}
              <span className="text-gray-600 ml-1">{order.timeSlot}</span>
            </div>
          )}

          {/* Customer Info */}
          <div>
            <strong className="text-gray-700 text-sm uppercase tracking-wide">
              Customer
            </strong>
            <p className="text-gray-800 mt-1">
              {order.customer?.name || "Guest"}
              {order.customer?.email && (
                <span className="block text-sm text-gray-600">
                  {order.customer.email}
                </span>
              )}
            </p>
          </div>

          {/* Delivery Address */}
          {order.address && (
            <div>
              <strong className="text-gray-700">Delivery Address</strong>
              <p className="text-gray-800 mt-1">
                {order.address}, {order.postcode}
              </p>
            </div>
          )}

          {/* Notes */}
          {order.orderNote && (
            <div>
              <strong className="text-gray-700">Special Notes</strong>
              <p className="text-gray-800 mt-1 italic bg-gray-50 p-3 rounded-lg border-l-4 border-gray-200">
                {order.orderNote}
              </p>
            </div>
          )}

          {/* Items */}
          <div>
            <strong className="text-gray-700 block mb-3">Ordered Items</strong>
            <ul className="space-y-3">
              {order.items.map((item: any) => (
                <li
                  key={item.id}
                  className="flex justify-between items-center p-3 bg-white border border-gray-100 rounded-xl shadow-sm"
                >
                  <div className="font-medium text-gray-800">
                    <div>
                      {item.quantity}× {item.food.name}
                    </div>
                    {item.foodOption && (
                      <div className="text-sm text-blue-600 mt-1">
                        + {item.foodOption.name}
                      </div>
                    )}
                  </div>
                  <span className="text-gray-700 font-semibold">
                    £{item.price * item.quantity}
                    {order.deliveryType === "DINEIN" &&
                      order.status !== "DELIVERED" && (
                        <button
                          onClick={() => deleteItemFromOrder(order.id, item.id)}
                          className="text-red-600 hover:text-red-800 ml-2"
                        >
                          {actionLoading === order.id ? "Removing..." : "×"}
                        </button>
                      )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-gray-200/50 bg-gray-50/50 rounded-b-3xl">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-medium rounded-xl transition-all duration-200 shadow-md"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;
