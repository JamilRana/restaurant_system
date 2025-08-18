// components/Waiter/OrderForm.tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type Food = {
  id: number;
  name: string;
  price: number;
  quantity:number;
  categoryId: number;
};

type Category = {
  id: number;
  name: string;
};

export default function OrderForm() {
  const {  data:session } = useSession();
  const [categories, setCategories] = useState<Category[]>([]);
  const [foods, setFoods] = useState<Food[]>([]);
  const [cart, setCart] = useState<Array<{ food: Food; quantity: number }>>([]);
  const [customerName, setCustomerName] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load menu
  useEffect(() => {
    const fetchMenu = async () => {
      const res = await fetch("/api/menu");
      const data = await res.json();
      setCategories(data.categories);
      setFoods(data.foods);
    };
    fetchMenu();
  }, []);

  const addToCart = (food: Food) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.food.id === food.id);
      if (existing) {
        return prev.map((item) =>
          item.food.id === food.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { food, quantity: 1 }];
    });
  };

  const updateQuantity = (foodId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.food.id === foodId
            ? { ...item, quantity: Math.max(1, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const getTotal = () => {
    return cart.reduce((sum, item) => sum + item.food.price * item.quantity, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    setLoading(true);
    setError("");

    const orderData = {
      items: cart.map((item) => ({
        foodId: item.food.id,
        quantity: item.food.quantity,
        price: item.food.price,
      })),
      customerName,
      tableNumber,
      paymentMethod,
      deliveryType: "PICKUP", // or "DINE_IN"
      totalAmount: getTotal(),
      // Optional: assign to waiter
      waiterId: session?.user?.id,
    };

    try {
      const res = await fetch("/api/waiter/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });

      if (!res.ok) throw new Error("Failed to create order");

      alert("Order created successfully!");
      setCart([]);
      setCustomerName("");
      setTableNumber("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Menu */}
      <div className="lg:col-span-2 overflow-y-auto max-h-[80vh]">
        <h2 className="text-xl font-semibold mb-4">Menu</h2>
        {categories.map((cat) => (
          <div key={cat.id} className="mb-6">
            <h3 className="text-lg font-medium border-b pb-2">{cat.name}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              {foods
                .filter((f) => f.categoryId === cat.id)
                .map((food) => (
                  <div
                    key={food.id}
                    className="border rounded-lg p-3 flex justify-between items-center hover:bg-gray-50"
                  >
                    <div>
                      <h4 className="font-medium">{food.name}</h4>
                      <p className="text-green-600 font-semibold">£{food.price.toFixed(2)}</p>
                    </div>
                    <button
                      onClick={() => addToCart(food)}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
                    >
                      Add
                    </button>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      {/* Cart */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Cart ({cart.length})</h2>
        {error && <p className="text-red-600 mb-4">{error}</p>}

        <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
          {cart.map((item) => (
            <div
              key={item.food.id}
              className="flex justify-between items-center text-sm"
            >
              <div>
                <span>{item.quantity}x {item.food.name}</span>
                <br />
                <span className="text-green-600">
                  £{(item.food.price * item.quantity).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateQuantity(item.food.id, -1)}
                  className="text-red-600"
                >
                  −
                </button>
                <span>{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.food.id, 1)}
                  className="text-green-600"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t pt-2 font-semibold">
          Total: £{getTotal().toFixed(2)}
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <input
            type="text"
            placeholder="Customer Name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full border px-3 py-2 rounded"
            required
          />
          <input
            type="text"
            placeholder="Table Number"
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          />
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as any)}
            className="w-full border px-3 py-2 rounded"
          >
            <option value="cash">Cash</option>
            <option value="card">Card</option>
          </select>
          <button
            type="submit"
            disabled={loading || cart.length === 0}
            className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
          >
            {loading ? "Creating..." : "Create Order"}
          </button>
        </form>
      </div>
    </div>
  );
}