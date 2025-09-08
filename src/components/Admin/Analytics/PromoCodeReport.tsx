// components/Admin/Analytics/PromoCodeReport.tsx
import React from "react";

interface PromoData {
  code: string;
  uses: number;
  discount: string;
}

interface PromoCodeReportProps {
  data: PromoData[] | null;
}

const PromoCodeReport: React.FC<PromoCodeReportProps> = ({ data }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md border">
      <h3 className="text-lg font-semibold text-gray-700 mb-4">
        Promo Code Usage
      </h3>
      {data && data.length > 0 ? (
        <ul className="space-y-2">
          {data.map((promo, idx) => (
            <li
              key={idx}
              className="flex justify-between py-1 border-b border-gray-100 last:border-0"
            >
              <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                {promo.code}
              </span>
              <div className="text-right">
                <div className="text-gray-800 font-medium">
                  {promo.uses} uses
                </div>
                <div className="text-gray-500 text-xs">{promo.discount}</div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500">No promo codes used</p>
      )}
    </div>
  );
};

export default PromoCodeReport;
