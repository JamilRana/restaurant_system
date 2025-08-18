import { AnalyticsDateProps, SalesTrendItem } from '@/types/analytics';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';

export default function SalesTrendChart({ dateRange }: AnalyticsDateProps) {
  const { data, isLoading } = useQuery<SalesTrendItem[]>({
    queryKey: ['salesTrend', dateRange],
    queryFn: async (): Promise<SalesTrendItem[]> => {
      const res = await axios.get('/api/admin/analytics/sales-trend', { params: dateRange });
      return res.data as SalesTrendItem[];
    }
  });

  if (isLoading) return <div className="bg-white p-6 rounded-lg shadow">Loading...</div>;

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold">Sales Trend</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="total" stroke="#10b981" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
