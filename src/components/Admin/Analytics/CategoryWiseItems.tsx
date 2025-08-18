// components/Admin/Analytics/CategoryWiseItems.tsx
import { AnalyticsDateProps } from "@/types/analytics";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function CategoryWiseItems({ dateRange }: AnalyticsDateProps) {
  const { data, isLoading } = useQuery({
    queryKey:["categoryItems"],
    queryFn: async () => {
      const res = await fetch("/api/admin/analytics/category-items");
      if (!res.ok) throw new Error("Failed to fetch");
      return (await res.json()) as { name: string; foodCount: number }[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
});

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        Loading chart...
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold">Category-wise Item Count</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="foodCount" fill="#10b981" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}