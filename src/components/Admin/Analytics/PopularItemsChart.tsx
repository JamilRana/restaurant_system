import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'; // ✅ recharts, not react-chartjs-2
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { AnalyticsDateProps, PopularItem } from '@/types/analytics';



export default function PopularItemsChart({ dateRange }: AnalyticsDateProps) {
  const { data, isLoading } = useQuery<PopularItem[]>({
    queryKey: ['popularItems', dateRange],
    queryFn: async (): Promise<PopularItem[]> => {
      const res = await axios.get('/api/admin/analytics/popular-items', { params: dateRange });
      return res.data as PopularItem[];
    },
  });

  if (isLoading || !data) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">Loading chart...</div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold">Top Selling Items</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="totalSold" fill="#4f46e5" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
