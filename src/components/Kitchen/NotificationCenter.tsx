// components/NotificationCenter.tsx
import { useRealtimeOrders } from "@/hooks/useRealtimeOrders";

export default function NotificationCenter() {
  const { orders } = useRealtimeOrders(restaurantId);

  return (
    <div className="bg-gray-100 p-4 rounded shadow">
      <h3 className="font-bold mb-2">Recent Updates</h3>
      <ul>
        {orders.map((order) => (
          <li key={order.id}>
            Order #{order.id} - {order.status}
          </li>
        ))}
      </ul>
    </div>
  );
}