// components/analytics/SalesCard.tsx
import { AnalyticsDateProps } from '@/types/analytics';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export default function SalesCard({ dateRange }:AnalyticsDateProps) {
  const { data, isLoading } = useQuery({
    queryKey:['sales', dateRange], 
    queryFn:async () => { const res = await axios.get('/api/admin/analytics/sales', {
      params: { from: dateRange.startDate, to: dateRange.endDate },
      
    });
    return res.data as { totalSales: number; totalOrders: number };
}
  });

  if (isLoading) return <div className="bg-white p-6 rounded-lg shadow animate-pulse">Loading...</div>;

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold text-gray-700">Total Sales</h3>
      <p className="text-3xl font-bold text-green-600 mt-2">£{data?.totalSales?.toFixed(2) || 0}</p>
      <p className="text-sm text-gray-500">{data?.totalOrders} orders</p>
    </div>
  );
}