// components/Cart.tsx
import React from "react";
import { useBasketStore } from "@/app/store/basketStore";
import DeliveryOptionSelector from "./DeliveryOptionSelector";
import { useRouter } from "next/navigation";
import Image from "next/image";

const Cart: React.FC = () => {
  const { basketItems, removeFromBasket, addToBasket, orderNote, setOrderNote } = useBasketStore();

  const subtotal = basketItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = subtotal  + (orderNote ? 0 : 0); // deliveryFee will be dynamic

  return (
    <div className="bg-white border rounded-lg p-4 shadow-sm text-sm">
      <div className="bg-green-600 text-white font-bold p-3 rounded flex items-center space-x-2 mb-4">
        <span>🛍️</span>
        <h2 className="text-lg">My Basket</h2>
      </div>

      {basketItems.length === 0 ? (
        <p className="text-gray-500 text-center">Your basket is empty.</p>
      ) : (
        basketItems.map((item) => (
          <div key={`${item.id}-${item.optionId}`} className="border-b pb-3 mb-3">
            <div className="flex justify-between items-center">
              <span className="text-green-600 font-bold">£{item.price.toFixed(2)}</span>
              <button
                onClick={() => removeFromBasket(item.id, item.optionId)}
                className="text-gray-400 hover:text-red-500 text-xs"
              >
                <Image src="/icons/bin.png" alt="Remove" width={15} height={5} />
              </button>
            </div>

            <div className="flex items-start gap-2 mt-2">
              <div className="flex items-center gap-1">
                <button
                  className={`px-2 py-1 text-xs rounded ${
                    item.quantity === 1
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-gray-200 hover:bg-gray-300"
                  }`}
                  onClick={() => removeFromBasket(item.id, item.optionId)}
                  disabled={item.quantity === 1}
                >
                  −
                </button>
                <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
                  {item.quantity}x
                </span>
                <button
                  className="px-2 py-1 text-xs bg-gray-200 rounded"
                  onClick={() =>
                    addToBasket({
                      id: item.id,
                      name: item.name,
                      price: item.price,
                      description: item.description,
                      image: item.image,
                      option: item.option,
                      optionId: item.optionId,
                    })
                  }
                >
                  +
                </button>
              </div>

              <div>
                <p className="font-semibold text-sm break-words">
                  {item.name} {item.option && `(${item.option.name})`}
                </p>
                <p className="text-gray-500 text-xs">{item.description}</p>
              </div>
            </div>
          </div>
        ))
      )}

      {/* Single Order Note */}
      {basketItems.length > 0 && (
        <div className="mt-4">
          <label className="block text-sm font-bold mb-1">Order Note (Optional)</label>
          <textarea
            value={orderNote}
            onChange={(e) => setOrderNote(e.target.value)}
            placeholder="Any allergies, special instructions, or delivery notes..."
            className="w-full border px-2 py-1 rounded text-sm h-20 resize-none"
          />
        </div>
      )}

      {/* Totals */}
      <div className="mt-4 text-sm space-y-1">
        <div className="flex justify-between">
          <span>Sub Total:</span>
          <span>£{subtotal.toFixed(2)}</span>
        </div>
      </div>

      <div className="bg-orange-500 text-white rounded mt-4 p-3 font-bold text-center text-lg">
        Total to pay £{total.toFixed(2)}
      </div>

      <DeliveryOptionSelector />
    </div>
  );
};

export default Cart;