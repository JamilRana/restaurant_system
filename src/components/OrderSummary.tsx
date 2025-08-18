import React from 'react';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface OrderSummaryProps {
  items: OrderItem[];
  discount?: number;
  deliveryFee?: number;
}

const OrderSummary: React.FC<OrderSummaryProps> = ({ items, discount = 0, deliveryFee = 0 }) => {
  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const total = subtotal - discount + deliveryFee;

  return (
    <div className="bg-gray-100 p-6 rounded shadow-md max-w-md mx-auto">
      <h2 className="text-lg font-semibold mb-4">Order Details</h2>

      {items.map((item, index) => (
        <div key={index} className="flex justify-between mb-2">
          <span>{item.quantity} x {item.name}</span>
          <span>£{(item.quantity * item.price).toFixed(2)}</span>
        </div>
      ))}

      <hr className="my-2" />

      <div className="flex justify-between">
        <span className="font-medium">Sub Total:</span>
        <span>£{subtotal.toFixed(2)}</span>
      </div>
      <div className="flex justify-between">
        <span className="font-medium">Discounts:</span>
        <span>-£{discount.toFixed(2)}</span>
      </div>
      <div className="flex justify-between">
        <span className="font-medium">Delivery Fee:</span>
        <span>£{deliveryFee.toFixed(2)}</span>
      </div>
      <hr className="my-2" />
      <div className="flex justify-between text-lg font-bold">
        <span>Total Pay:</span>
        <span>£{total.toFixed(2)}</span>
      </div>
    </div>
  );
};

export default OrderSummary;
