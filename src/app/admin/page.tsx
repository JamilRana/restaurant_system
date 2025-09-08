// app/admin/analytics/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import DateRangePicker from "@/components/DateRangePicker";
import SalesCard from "@/components/Admin/Analytics/SalesCard";
import ProfitCard from "@/components/Admin/Analytics/ProfitCard";
import AvgOrderCard from "@/components/Admin/Analytics/AvgOrderCard";
import RetentionCard from "@/components/Admin/Analytics/RetentionCard";
import SalesTrendChart from "@/components/Admin/Analytics/SalesTrendChart";
import CategoryBreakdownChart from "@/components/Admin/Analytics/CategoryBreakdownChart";
import OrderTypeBreakdown from "@/components/Admin/Analytics/OrderTypeBreakdown";
import PeakHoursChart from "@/components/Admin/Analytics/PeakHoursChart";
import TopDeliveryLocations from "@/components/Admin/Analytics/TopDeliveryLocations";
import PromoCodeReport from "@/components/Admin/Analytics/PromoCodeReport";
import EmployeePerformanceTable from "@/components/Admin/Analytics/EmployeePerformanceTable";
import { RouteLoader } from "@/components/RouteLoader";

type DateRange = { startDate: Date | null; endDate: Date | null };

export default function AnalyticsDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: null,
    endDate: null,
  });

  // Initialize date range and fetch data only once session is ready
  useEffect(() => {
    if (status === "loading") return;

    if (!session || session.user.role !== "ADMIN") {
      router.push("/");
      return;
    }

    // Set default date range: last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);

    // Set dates and trigger initial fetch
    setDateRange({ startDate, endDate });
  }, [session, status, router]);

  // Fetch data whenever dateRange changes
  useEffect(() => {
    if (!dateRange.startDate || !dateRange.endDate) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const startDateStr = dateRange.startDate?.toISOString().split("T")[0];
        const endDateStr = dateRange.endDate?.toISOString().split("T")[0];

        const url = `/api/admin/analytics?startDate=${startDateStr}&endDate=${endDateStr}`;

        const res = await fetch(url);

        if (!res.ok) {
          throw new Error(`Failed to fetch analytics: ${res.status}`);
        }

        const json = await res.json();
        setData(json);
      } catch (error) {
        console.error("Error fetching analytics:", error);
        setData({
          summary: {
            totalSales: 0,
            netProfit: 0,
            avgOrderValue: 0,
            totalOrders: 0,
            retentionRate: 0,
          },
          salesTrend: [],
          categorySales: [],
          orderTypes: { PICKUP: 0, DELIVERY: 0, DINEIN: 0 },
          hourlySales: [],
          topZones: [],
          promoUsage: [],
          staffPerformance: [],
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateRange]); // Re-fetch when date range changes

  if (status === "loading" || loading) return <RouteLoader />;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">
        Analytics Dashboard
      </h1>
      <p className="text-gray-600 mb-6">
        Track performance, costs, and customer behavior
      </p>

      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <SalesCard data={data?.summary} />
        <ProfitCard data={data?.summary} />
        <AvgOrderCard data={data?.summary} />
        <RetentionCard data={data?.summary} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <SalesTrendChart data={data?.salesTrend} />
        <CategoryBreakdownChart data={data?.categorySales} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <OrderTypeBreakdown data={data?.orderTypes} />
        <PeakHoursChart data={data?.hourlySales} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <TopDeliveryLocations data={data?.topZones} />
        <PromoCodeReport data={data?.promoUsage} />
      </div>

      <div className="mb-8">
        <EmployeePerformanceTable data={data?.staffPerformance} />
      </div>
    </div>
  );
}
