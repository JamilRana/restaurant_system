// components/Admin/Analytics/PeakTimesChart.tsx
import { AnalyticsDateProps } from "@/types/analytics";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function PeakTimesChart({ dateRange }: AnalyticsDateProps) {
  const { data, isLoading } = useQuery({
    queryKey:["peakTimes", dateRange],
    queryFn:async () => {
      const res = await axios.get("/api/admin/analytics/peak-times", { params: dateRange });
      return res.data as { hour: number; count: number }[];
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
      <h3 className="text-lg font-semibold">Peak Order Hours</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <XAxis dataKey="hour" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="count" fill="#ff7875" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}