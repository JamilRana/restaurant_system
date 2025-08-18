// components/Admin/Analytics/TotalCustomersCard.tsx
import { AnalyticsDateProps } from "@/types/analytics";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";


export default function TotalCustomersCard({ dateRange }: AnalyticsDateProps) {
  const { data, isLoading } = useQuery({
    queryKey:["customers", dateRange],
    queryFn:async () => {
      const res = await axios.get("/api/admin/analytics/total-stats");
      return res.data as { customers: { totalCustomers: number } };
    },
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  );

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow animate-pulse">
        Loading...
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold text-gray-700">Total Customers</h3>
      <p className="text-3xl font-bold text-blue-600 mt-2">
        {data?.customers.totalCustomers || 0}
      </p>
    </div>
  );
}