import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export default function StaffCard() {
  const { data, isLoading } = useQuery({
    queryKey: ["staff"],
    queryFn: async () => {
      const res = await axios.get("/api/admin/analytics/total-stats");
      return res.data as { staff: { totalStaff: number; activeStaff: number } };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow animate-pulse">
        Loading...
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold text-gray-700">Total Staff</h3>
      <p className="text-3xl font-bold text-indigo-600 mt-2">
        {data?.staff.totalStaff || 0}
      </p>
      <p className="text-sm text-gray-500">
        Active: {data?.staff.activeStaff || 0}
      </p>
    </div>
  );
}
