// components/kitchen/OrderCardModal.tsx
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

interface User {
  id: number;
  email: string;
  staff: { name: string } | null;
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
  // Determine customer name

  // Format date
  const formatDate = (date: string) => new Date(date).toLocaleString();

  // Print function
  const printOrder = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const addedItems = order.items.filter(
      (item) => new Date(item.addedAt) > new Date(order.createdAt)
    );

    printWindow.document.write(`
      <html>
        <head>
          <title>Order #${order.id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
            .section { margin: 15px 0; }
            .item { display: flex; justify-content: space-between; padding: 2px 0; }
            .note { font-style: italic; color: #555; margin-left: 10px; }
            .added { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 8px; margin: 10px 0; }
            .total { font-weight: bold; margin-top: 10px; }
            @media print {
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Order #${order.id}</h1>
            <p>${formatDate(order.createdAt)}</p>
          </div>

          <div class="section">
            <p><strong>Type:</strong> ${order.deliveryType}</p>
            ${order.table ? `<p><strong>Table:</strong> ${order.table.number}</p>` : ""}
            ${order.timeSlot ? `<p><strong>Time Slot:</strong> ${order.timeSlot}</p>` : ""}
            ${order.createdBy ? `<p><strong>Created By:</strong> ${order.createdBy.email.split('@')[0]}</p>` : ""}
          </div>

          <h3>Items:</h3>
          <ul>
            ${order.items
              .map(
                (item) => `
              <li class="${new Date(item.addedAt) > new Date(order.createdAt) ? 'added' : ''}">
                <div class="item">
                  <span>
                    ${item.quantity}x ${item.food.name}
                    ${item.foodOption ? ` (+${item.foodOption.name})` : ""}
                    ${item.notes ? `<span class="note"> — ${item.notes}</span>` : ""}
                  </span>
                </div>
              </li>
            `
              )
              .join("")}
          </ul>

          <div class="total">
            <strong>Total: £${order.items
              .reduce((sum, item) => sum + item.price * item.quantity, 0)
              .toFixed(2)}</strong>
          </div>

          <script>print();</script>
        </body>
      </html>
    `);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full max-h-96 overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">Order Details #{order.id}</h3>

        <div className="space-y-2 text-sm">
          <p><strong>Status:</strong> {order.status}</p>
          <p><strong>Date:</strong> {formatDate(order.createdAt)}</p>
          <p><strong>Type:</strong> {order.deliveryType}</p>
          {order.table && <p><strong>Table:</strong> {order.table.number}</p>}
          {order.timeSlot && <p><strong>Time Slot:</strong> {order.timeSlot}</p>}
          {order.createdBy && (
            <p><strong>Created By:</strong> {order.createdBy.email.split('@')[0]}</p>
          )}
          {order.orderNote && (
            <p><strong>Order Notes:</strong> {order.orderNote}</p>
          )}
        </div>

        <h4 className="font-bold mt-4">Items:</h4>
        <ul className="space-y-2 mt-2">
          {order.items.map((item) => {
            const isAddedLater = new Date(item.addedAt) > new Date(order.createdAt);
            return (
              <li
                key={item.id}
                className={`text-sm p-2 rounded ${
                  isAddedLater ? "bg-orange-50 border-l-4 border-orange-500" : ""
                }`}
              >
                <div className="flex justify-between">
                  <span>
                    {item.quantity}x {item.food.name}
                    {item.foodOption && ` (+${item.foodOption.name})`}
                    {item.notes && <span className="text-gray-600 ml-1">— {item.notes}</span>}
                  </span>
                </div>
                {isAddedLater && (
                  <span className="text-xs text-red-600 font-semibold">🔁 Added Later</span>
                )}
              </li>
            );
          })}
        </ul>

        <div className="mt-6 flex gap-3">
          <button
            onClick={printOrder}
            className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 flex items-center justify-center gap-2"
          >
            🖨️ Print Order
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-500 text-white py-2 rounded hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderCardModal;