// types/analytics.ts


export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface AnalyticsDateProps {
  dateRange: DateRange;
}

// --- Sales ---
export type SalesData = {
  totalSales: number;
  totalOrders: number;
};

// --- Finances ---
export type FinanceData = {
  income: number;
  expenses: number;
};

// --- Customers ---
export type CustomerStats = {
  totalCustomers: number;
  guestCustomers: number;
  registeredCustomers: number;
};

// --- Staff ---
export type StaffStats = {
  totalStaff: number;
  activeStaff: number;
};

// --- Sales Trend ---
export type SalesTrendItem = {
  date: string;
  total: number;
  orders: number;
};

// --- Popular Items ---
export type PopularItem = {
  foodId: number;
  name: string;
  image: string | null;
  totalSold: number;
};

// --- Peak Times ---
export type PeakHour = {
  hour: number;
  count: number;
};

// --- Order Types ---
export type OrderTypeData = {
  type: 'PICKUP' | 'DELIVERY';
  count: number;
};

// --- Promo Codes ---
export type PromoCodeUsage = {
  code: string;
  uses: number;
};

// --- Delivery Locations ---
export type DeliveryLocation = {
  postcode: string;
  count: number;
};

// --- Category Items ---
export type CategoryItem = {
  name: string;
  foodCount: number;
};

// --- Real-time Update Event ---
export type RealtimeUpdate =
  | { type: 'SALES_UPDATE'; data: SalesData }
  | { type: 'ORDER_UPDATE'; data: OrderTypeData[] }
  | { type: 'NEW_ORDER'; data: { orderId: number; total: number } };