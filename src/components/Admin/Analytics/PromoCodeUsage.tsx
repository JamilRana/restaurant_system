// components/Admin/Analytics/PromoCodeUsage.tsx
import { AnalyticsDateProps } from "@/types/analytics";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function PromoCodeUsage({ dateRange }: AnalyticsDateProps) {
  const { data, isLoading } = useQuery({
    queryKey:["promoCodes", dateRange],
    queryFn:async () => {
      const res = await axios.get("/api/admin/analytics/promo-codes", { params: dateRange });
      return res.data as { code: string; uses: number }[];
    },
    
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  );

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        Loading chart...
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold">Promo Code Usage</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <XAxis dataKey="code" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="uses" fill="#4f46e5" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}