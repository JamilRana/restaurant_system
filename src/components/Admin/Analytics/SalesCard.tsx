// components/Admin/Analytics/SalesCard.tsx
import React from "react";

interface SalesCardProps {
  data: { totalSales: number } | null;
}

const SalesCard: React.FC<SalesCardProps> = ({ data }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md border hover:shadow-lg transition-shadow">
      <h3 className="text-lg font-semibold text-gray-700">Total Sales</h3>
      <p className="text-3xl font-bold text-green-600 mt-2">
        £{data?.totalSales?.toFixed(2) || "0.00"}
      </p>
      <p className="text-sm text-gray-500 mt-1">
        Gross revenue from all orders
      </p>
    </div>
  );
};

export default SalesCard;
