// components/Admin/Analytics/RetentionCard.tsx
import React from "react";

interface RetentionCardProps {
  data: { retentionRate: number } | null;
}

const RetentionCard: React.FC<RetentionCardProps> = ({ data }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md border hover:shadow-lg transition-shadow">
      <h3 className="text-lg font-semibold text-gray-700">
        Customer Retention
      </h3>
      <p className="text-3xl font-bold text-orange-600 mt-2">
        {data?.retentionRate?.toFixed(1) || "0"}%
      </p>
      <p className="text-sm text-gray-500 mt-1">Returning customers rate</p>
    </div>
  );
};

export default RetentionCard;
