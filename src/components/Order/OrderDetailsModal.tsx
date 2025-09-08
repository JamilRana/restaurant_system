// components/OrderDetailsModal.tsx
import React from "react";

interface OrderDetailsModalProps {
  order: any;
  onClose: () => void;
}

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  order,
  onClose,
}) => {
  // Status badge color mapping
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "confirmed":
        return "bg-blue-100 text-blue-800";
      case "preparing":
        return "bg-indigo-100 text-indigo-800";
      case "out for delivery":
      case "on the way":
        return "bg-purple-100 text-purple-800";
      case "delivered":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white/95 backdrop-blur-sm border border-white/30 rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col transform transition-all duration-300 scale-100 hover:scale-[1.01]"
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

          {/* Time Slot */}
          <div>
            <strong className="text-gray-700 text-sm uppercase tracking-wide">
              {order.deliveryType}
            </strong>{" "}
            <span className="text-gray-600 ml-1">around {order.timeSlot}</span>
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
                "{order.orderNote}"
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
                  className="flex justify-between items-center p-3 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-shadow"
                >
                  <span className="font-medium text-gray-800">
                    {item.quantity}× {item.food.name}
                  </span>
                  <span className="text-gray-700 font-semibold">
                    £{item.price * item.quantity}
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
            className="w-full py-3 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-medium rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-md"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;
