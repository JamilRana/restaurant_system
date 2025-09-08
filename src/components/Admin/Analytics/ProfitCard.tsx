// components/Admin/Analytics/ProfitCard.tsx
import React from "react";

interface ProfitCardProps {
  data: { netProfit: number } | null;
}

const ProfitCard: React.FC<ProfitCardProps> = ({ data }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md border hover:shadow-lg transition-shadow">
      <h3 className="text-lg font-semibold text-gray-700">Net Profit</h3>
      <p className="text-3xl font-bold text-blue-600 mt-2">
        £{data?.netProfit?.toFixed(2) || "0.00"}
      </p>
      <p className="text-sm text-gray-500 mt-1">
        After expenses (salaries, groceries, etc.)
      </p>
    </div>
  );
};

export default ProfitCard;
