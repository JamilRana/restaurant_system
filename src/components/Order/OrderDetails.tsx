"use client";
import React from "react";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  option?: { name: string; price: number };
}

interface OrderDetailsProps {
  items: OrderItem[];
  subTotal: number;
  discount: number;
  deliveryFee: number;
  deliveryMode: string;
  notes: string;
  postcode: string;
  address: string;
}

const OrderDetails: React.FC<OrderDetailsProps> = ({
  items,
  subTotal,
  discount,
  deliveryFee,
  deliveryMode,
  notes,
  postcode,
  address,
}) => {
  const total = subTotal - Number(discount || 0) + Number(deliveryFee || 0);

  return (
    <div className="bg-gray-100 p-6 rounded-lg shadow">
      <h3 className="font-bold text-xl mb-4">Order Summary</h3>

      {items.length === 0 ? (
        <p className="text-gray-500">No items in cart.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left pb-2">Item</th>
              <th className="text-right pb-2">Qty</th>
              <th className="text-right pb-2">Price</th>
            </tr>
          </thead>
          <tbody className="space-y-1">
            {items.map((item, index) => (
              <tr key={index} className="border-b last:border-b-0">
                <td className="py-2">
                  {item.name}
                  {item.option && (
                    <div className="text-xs text-gray-600">
                      {item.option.name}
                    </div>
                  )}
                </td>
                <td className="text-right py-2">{item.quantity}x</td>
                <td className="text-right py-2">
                  £{(item.price * item.quantity).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <hr className="my-4" />

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Sub Total:</span>
          <span>£{subTotal.toFixed(2)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between">
            <span>Discount:</span>
            <span>- £{discount.toFixed(2)}</span>
          </div>
        )}
        {deliveryMode === "delivery" && (
          <div className="flex justify-between">
            <span>Delivery Fee:</span>
            <span>£{Number(deliveryFee || 0).toFixed(2)}</span>
          </div>
        )}
      </div>

      <hr className="my-4" />

      <div className="flex justify-between font-bold text-lg">
        <span>Total:</span>
        <span>£{total.toFixed(2)}</span>
      </div>

      {notes && (
        <>
          <hr className="my-4" />
          <div className="text-sm">
            <strong>Notes:</strong> {notes}
          </div>
        </>
      )}
    </div>
  );
};

export default OrderDetails;
