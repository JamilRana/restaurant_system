import React from "react";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface OrderSummaryProps {
  items: OrderItem[];
  discount?: number;
  deliveryFee?: number;
  title?: string;
}

const OrderSummary: React.FC<OrderSummaryProps> = ({
  items,
  discount = 0,
  deliveryFee = 0,
  title = "Order Summary",
}) => {
  const subtotal = items.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );
  const total = subtotal - discount + deliveryFee;

  if (items.length === 0) {
    return (
      <div className="bg-white/60 backdrop-blur-md border border-gray-200 rounded-2xl p-6 max-w-md mx-auto text-center shadow-lg">
        <p className="text-gray-500 text-sm">Your order is empty.</p>
      </div>
    );
  }

  return (
    <div className="bg-white/70 backdrop-blur-md border border-gray-200/60 rounded-2xl shadow-xl p-6 max-w-md mx-auto transform transition-all hover:shadow-2xl duration-300">
      {/* Header */}
      <h2 className="text-xl font-bold text-gray-800 mb-5 flex items-center gap-2">
        🧾 <span>{title}</span>
      </h2>

      {/* Items List */}
      <div className="space-y-3 mb-5">
        {items.map((item, index) => (
          <div
            key={index}
            className="flex justify-between items-start text-sm md:text-base"
          >
            <div className="flex-1">
              <span className="font-medium text-gray-800">
                {item.quantity} × {item.name}
              </span>
            </div>
            <div className="text-right min-w-[70px]">
              <span className="font-semibold text-gray-700">
                £{(item.quantity * item.price).toFixed(2)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200/70 my-4"></div>

      {/* Subtotal */}
      <div className="flex justify-between text-gray-700 mb-2">
        <span>Subtotal</span>
        <span>£{subtotal.toFixed(2)}</span>
      </div>

      {/* Discount */}
      {discount > 0 && (
        <div className="flex justify-between text-green-600 mb-2">
          <span>Discount</span>
          <span>-£{discount.toFixed(2)}</span>
        </div>
      )}

      {/* Delivery Fee */}
      <div className="flex justify-between text-gray-700 mb-2">
        <span>Delivery</span>
        <span>£{deliveryFee.toFixed(2)}</span>
      </div>

      {/* Final Divider */}
      <div className="border-t border-gray-200/70 my-4"></div>

      {/* Total */}
      <div className="flex justify-between text-xl font-bold text-gray-900">
        <span>Total Pay</span>
        <span className="text-blue-600">£{total.toFixed(2)}</span>
      </div>
    </div>
  );
};

export default OrderSummary;
