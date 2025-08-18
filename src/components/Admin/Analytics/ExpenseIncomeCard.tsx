import { AnalyticsDateProps } from "@/types/analytics";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";


export default function ExpenseIncomeCard({ dateRange }: AnalyticsDateProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['finances', dateRange],
    queryFn: async () => {
      const res = await axios.get('/api/admin/analytics/finances', { params: dateRange });
      return res.data as { income: number; expenses: number };
    },
  });

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow animate-pulse">
        Loading...
      </div>
    );
  }

  const profit = (data?.income || 0) - (data?.expenses || 0);

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold text-gray-700">Income & Expenses</h3>
      <div className="mt-4 space-y-2">
        <p>
          <span className="text-green-600">Income:</span> £{data?.income?.toFixed(2)}
        </p>
        <p>
          <span className="text-red-600">Expenses:</span> £{data?.expenses?.toFixed(2)}
        </p>
        <p>
          <strong>Profit:</strong> £{profit.toFixed(2)}
        </p>
      </div>
    </div>
  );
}
