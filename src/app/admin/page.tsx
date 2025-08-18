// pages/dashboard/analytics.tsx
"use client"
import { useState } from 'react';
import SalesCard from '@/components/Admin/Analytics/SalesCard';
import DateRangePicker from '@/components/DateRangePicker';
import ExpenseIncomeCard from '@/components/Admin/Analytics/ExpenseIncomeCard';
import TotalCustomersCard from '@/components/Admin/Analytics/TotalCustomersCard';
import StaffCard from '@/components/Admin/Analytics/StaffCard';
import SalesTrendChart from '@/components/Admin/Analytics/SalesTrendChart';
import PopularItemsChart from '@/components/Admin/Analytics/PopularItemsChart';
import PeakTimesChart from '@/components/Admin/Analytics/PeakTimeChart';
import OrderTypeBreakdown from '@/components/Admin/Analytics/OrderTypeBreakdown';
import TopDeliveryLocations from '@/components/Admin/Analytics/TopDeliveryLocations';
import PromoCodeUsage from '@/components/Admin/Analytics/PromoCodeUsage';
import CategoryWiseItems from '@/components/Admin/Analytics/CategoryWiseItems';

export default function AnalyticsDashboard() {
  const [dateRange, setDateRange] = useState<{ startDate: Date; endDate: Date }>({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)),
    endDate: new Date(),
  });

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Analytics Dashboard</h1>

      {/* Date Filter */}
      <div className="mb-6">
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* Stats Cards (Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <SalesCard dateRange={dateRange} />
        <ExpenseIncomeCard dateRange={dateRange} />
        <TotalCustomersCard dateRange={dateRange} />
        <StaffCard />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <SalesTrendChart dateRange={dateRange} />
        <PopularItemsChart dateRange={dateRange} />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <PeakTimesChart dateRange={dateRange} />
        <OrderTypeBreakdown dateRange={dateRange} />
      </div>

      {/* Charts Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <TopDeliveryLocations dateRange={dateRange} />
        <PromoCodeUsage dateRange={dateRange} />
      </div>

      {/* Final Chart */}
      <div className="mb-8">
        <CategoryWiseItems dateRange={dateRange} />
      </div>
    </div>
  );
}