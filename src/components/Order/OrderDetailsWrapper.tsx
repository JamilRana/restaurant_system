"use client";

import React from "react";
import OrderDetails from "./OrderDetails";
import { useBasketStore } from "@/app/store/basketStore";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  option?: { name: string; price: number };
}

const OrderDetailsWrapper = () => {
  // ✅ Always call these hooks at the top level (unconditional)
  const basketItems = useBasketStore((state) => state.basketItems);
  const deliveryFee = useBasketStore((state) => state.deliveryFee);
  const orderNote = useBasketStore((state) => state.orderNote);
  const postcode = useBasketStore((state) => state.postcode);
  const address = useBasketStore((state) => state.address);
  const deliveryMode = useBasketStore((state) => state.deliveryMode);
  const discount = useBasketStore((state) => state.discountAmount); 

  // Now map and compute after reading all state
  const items: OrderItem[] = basketItems.map((item) => ({
    name: item.name,
    quantity: item.quantity,
    price: item.price,
    option: item.option,
  }));

  const subTotal = items.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  return (
    <OrderDetails
      items={items}
      subTotal={subTotal}
      discount={discount}
      deliveryFee={deliveryFee} // ✅ Safe: always a number
      deliveryMode={deliveryMode}
      notes={basketItems.length > 0 ? orderNote : ""} // ✅ Condition applied to value, not hook
      postcode={postcode}
      address={address}
    />
  );
};

export default OrderDetailsWrapper;
