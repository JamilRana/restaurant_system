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
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full max-h-96 overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">Order Details #{order.id}</h3>
        <p>
          <strong>Status:</strong> {order.status}
        </p>
        <p>
          <strong>Time Slot:</strong> {order.timeSlot}
        </p>
        <p>
          <strong>Delivery:</strong> {order.address}, {order.zipcode}
        </p>
        {order.orderNote && (
          <p>
            <strong>Notes:</strong> {order.orderNote}
          </p>
        )}
        <h4 className="font-bold mt-4">Items:</h4>
        <ul className="space-y-2 mt-2">
          {order.items.map((item: any) => (
            <li key={item.id} className="text-sm">
              {item.quantity}x {item.food.name} - £
              {(item.price * item.quantity).toFixed(2)}
              
            </li>
          ))}
        </ul>

        <button
          onClick={onClose}
          className="mt-6 w-full bg-gray-500 text-white py-2 rounded"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default OrderDetailsModal;
