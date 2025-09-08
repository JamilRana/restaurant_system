// components/Kitchen/OrderCardModal.tsx
import React from "react";

interface FoodOption {
  id: number;
  name: string;
  price: number;
}

interface Food {
  id: number;
  name: string;
  options: FoodOption[];
}

interface OrderItem {
  id: number;
  quantity: number;
  price: number;
  foodOptionId: number | null;
  notes: string | null;
  food: Food;
  foodOption: FoodOption | null;
  addedAt: string; // ISO date
}

interface Staff {
  id: number;
  name: string;
}

interface User {
  id: number;
  email: string;
  staff: Staff | null;
}

interface Order {
  id: number;
  status: string;
  deliveryType: "PICKUP" | "DELIVERY" | "DINEIN";
  timeSlot: string | null;
  orderNote: string | null;
  createdAt: string;
  items: OrderItem[];
  createdBy: User | null;
  table: { number: string } | null;
  guestName: string | null;
}

interface OrderCardModalProps {
  order: Order;
  onClose: () => void;
}

const OrderCardModal: React.FC<OrderCardModalProps> = ({ order, onClose }) => {
  const formatDate = (date: string) =>
    new Date(date).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  const formatTime = (date: string) =>
    new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  const getTotal = () => {
    return order.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
  };

  const getStaffName = () => {
    if (!order.createdBy) return "Unknown";
    return order.createdBy.staff?.name || order.createdBy.email.split("@")[0];
  };

  const printOrder = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to print.");
      return;
    }

    const total = getTotal();

    printWindow.document.write(`
      <html>
        <head>
          <title>Order #${order.id}</title>
          <style>
            body {
              font-family: 'Segoe UI', Arial, sans-serif;
              padding: 20px;
              color: #1a1a1a;
            }
            .header {
              text-align: center;
              border-bottom: 2px dashed #000;
              padding-bottom: 15px;
              margin-bottom: 20px;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: bold;
            }
            .info-grid {
              display: grid;
              grid-template-columns: auto 1fr;
              gap: 8px 12px;
              margin: 15px 0;
            }
            .label {
              font-weight: bold;
            }
            .item-list {
              margin: 15px 0;
            }
            .item-row {
              display: flex;
              justify-content: space-between;
              padding: 4px 0;
              font-size: 14px;
            }
            .item-name {
              flex: 1;
            }
            .item-qty {
              width: 30px;
              text-align: right;
              margin-right: 10px;
            }
            .item-price {
              width: 60px;
              text-align: right;
              font-weight: bold;
            }
            .note {
              font-style: italic;
              color: #555;
              font-size: 12px;
              margin-left: 10px;
            }
            .added-later {
              background-color: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 10px;
              margin: 10px 0;
              border-radius: 4px;
            }
            .total-row {
              font-weight: bold;
              font-size: 16px;
              margin-top: 15px;
              padding-top: 10px;
              border-top: 1px solid #000;
              display: flex;
              justify-content: space-between;
            }
            @media print {
              body {
                padding: 10px;
                max-width: 80mm;
                font-size: 12px;
              }
              button, .no-print {
                display: none !important;
              }
              .header h1 {
                font-size: 24px;
              }
              .total-row {
                font-size: 14px;
              }
            }
            @page {
              margin: 5mm;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>ORDER #${order.id}</h1>
            <p>${formatDate(order.createdAt)}</p>
          </div>

          <div class="info-grid">
            <div class="label">Type:</div>
            <div>${order.deliveryType}</div>
            
            ${
              order.table
                ? `<div class="label">Table:</div><div>${order.table.number}</div>`
                : ""
            }
            
            ${
              order.timeSlot
                ? `<div class="label">Time:</div><div>${order.timeSlot}</div>`
                : ""
            }
            
            <div class="label">Prepared By:</div>
            <div>${getStaffName()}</div>
          </div>

          <h3 class="no-print" style="margin: 15px 0 8px 0; color: #333;">Items:</h3>
          <div class="item-list">
            ${order.items
              .map((item) => {
                const isAddedLater =
                  new Date(item.addedAt) > new Date(order.createdAt);
                const option = item.foodOption
                  ? ` (+${item.foodOption.name})`
                  : "";
                const note = item.notes
                  ? ` — <span class="note">${item.notes}</span>`
                  : "";
                const row = `
                    <div class="item-row">
                      <span class="item-qty">${item.quantity}x</span>
                      <span class="item-name">${
                        item.food.name
                      }${option}${note}</span>
                      <span class="item-price">£${(
                        item.price * item.quantity
                      ).toFixed(2)}</span>
                    </div>
                  `;
                return isAddedLater
                  ? `<div class="added-later">${row}<div style="font-size:11px;color:#777;margin-top:4px">🔁 Added after order creation</div></div>`
                  : row;
              })
              .join("")}
          </div>

          <div class="total-row">
            <span>TOTAL</span>
            <span>£${total.toFixed(2)}</span>
          </div>

          <script>
            setTimeout(() => {
              print();
              setTimeout(() => window.close(), 1000);
            }, 500);
          </script>
        </body>
      </html>
    `);
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-lg w-full"
        onClick={(e) => e.stopPropagation()} // ✅ Prevents close on inner click
      >
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-700 text-white p-5 rounded-t-xl">
          <div>
            <h3 className="text-2xl font-bold">Order #{order.id}</h3>
            <p className="text-blue-100">{formatTime(order.createdAt)}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 hover:text-blue-700 transition-colors"
            aria-label="Close"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="red"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="font-medium text-gray-500">Status</span>
              <p className="font-semibold text-gray-800 capitalize">
                {order.status}
              </p>
            </div>
            <div>
              <span className="font-medium text-gray-500">Type</span>
              <p className="font-semibold text-gray-800">
                {order.deliveryType}
              </p>
            </div>
            {order.table && (
              <div>
                <span className="font-medium text-gray-500">Table</span>
                <p className="font-semibold text-gray-800">
                  {order.table.number}
                </p>
              </div>
            )}
            <div>
              <span className="font-medium text-gray-500">Prepared By</span>
              <p className="font-semibold text-gray-800">{getStaffName()}</p>
            </div>
          </div>

          {/* Order Note */}
          {order.orderNote && (
            <div className="bg-gray-50 p-3 rounded-lg border-l-4 border-blue-400">
              <span className="text-sm font-medium text-blue-800">Note</span>
              <p className="text-sm text-blue-700 mt-1">{order.orderNote}</p>
            </div>
          )}

          {/* Items */}
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Items</h4>
            <ul className="space-y-2">
              {order.items.map((item) => {
                const isAddedLater =
                  new Date(item.addedAt) > new Date(order.createdAt);
                const option = item.foodOption
                  ? ` (+${item.foodOption.name})`
                  : "";
                const lineTotal = item.price * item.quantity;
                return (
                  <li
                    key={item.id}
                    className={`text-sm p-3 rounded-lg border ${
                      isAddedLater
                        ? "bg-orange-50 border-orange-200"
                        : "bg-gray-50"
                    }`}
                  >
                    <div className="flex justify-between mb-1">
                      <span className="font-medium text-gray-800">
                        {item.quantity}x {item.food.name}
                        {option}
                      </span>
                      <span className="font-bold text-green-600">
                        £{lineTotal.toFixed(2)}
                      </span>
                    </div>
                    {item.notes && (
                      <p className="text-xs text-gray-600 italic mb-1">
                        Note: {item.notes}
                      </p>
                    )}
                    {isAddedLater && (
                      <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full font-medium">
                        🔁 Added Later
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t bg-gray-50 rounded-b-xl flex gap-3">
          <button
            onClick={printOrder}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition"
          >
            🖨️ Print
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2.5 rounded-lg font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderCardModal;
