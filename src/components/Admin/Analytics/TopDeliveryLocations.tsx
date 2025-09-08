// components/Admin/Analytics/TopDeliveryLocations.tsx
import React from "react";

interface LocationData {
  postcode: string;
  count: number;
}

interface TopDeliveryLocationsProps {
  data: LocationData[] | null;
}

const TopDeliveryLocations: React.FC<TopDeliveryLocationsProps> = ({
  data,
}) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md border">
      <h3 className="text-lg font-semibold text-gray-700 mb-4">
        Top Delivery Zones
      </h3>
      {data && data.length > 0 ? (
        <ul className="space-y-2">
          {data.map((zone, idx) => (
            <li
              key={idx}
              className="flex justify-between py-1 border-b border-gray-100 last:border-0"
            >
              <span className="font-medium">{zone.postcode}</span>
              <span className="text-gray-600">{zone.count} orders</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500">No delivery data available</p>
      )}
    </div>
  );
};

export default TopDeliveryLocations;
