// components/Admin/Analytics/OrderTypeBreakdown.tsx
"use client";

import { AnalyticsDateProps } from "@/types/analytics";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export default function OrderTypeBreakdown({ dateRange }: AnalyticsDateProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["orderTypes", dateRange],
    queryFn: async () => {
      const res = await axios.get("/api/admin/analytics/order-types", { params: dateRange });
      return res.data as { type: "PICKUP" | "DELIVERY"; count: number }[];
    },
  });

  if (isLoading || !data) {
    return <div className="bg-white p-6 rounded-lg shadow">Loading...</div>;
  }

  const pickup = data.find(d => d.type === "PICKUP")?.count || 0;
  const delivery = data.find(d => d.type === "DELIVERY")?.count || 0;
  const total = pickup + delivery;
  const pickupPercent = total ? Math.round((pickup / total) * 100) : 0;
  const deliveryPercent = total ? Math.round((delivery / total) * 100) : 0;

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Order Types</h3>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm">
            <span>Pickup</span>
            <span>{pickup} orders ({pickupPercent}%)</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${pickupPercent}%` }}
            ></div>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm">
            <span>Delivery</span>
            <span>{delivery} orders ({deliveryPercent}%)</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
            <div
              className="bg-green-600 h-2 rounded-full"
              style={{ width: `${deliveryPercent}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}