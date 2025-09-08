// components/Admin/Analytics/AvgOrderCard.tsx
import React from "react";

interface AvgOrderCardProps {
  data: { avgOrderValue: number } | null;
}

const AvgOrderCard: React.FC<AvgOrderCardProps> = ({ data }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md border hover:shadow-lg transition-shadow">
      <h3 className="text-lg font-semibold text-gray-700">Avg Order Value</h3>
      <p className="text-3xl font-bold text-purple-600 mt-2">
        £{data?.avgOrderValue?.toFixed(2) || "0.00"}
      </p>
      <p className="text-sm text-gray-500 mt-1">
        Average spend per completed order
      </p>
    </div>
  );
};

export default AvgOrderCard;
