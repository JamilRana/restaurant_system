// types/index.ts
import { ExpenseCategory, SalaryPeriod, StaffRole } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

// --- Pagination ---
export type Paginated<T> = {
  data: T[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
};

// --- Basket Item ---
export interface BasketItem {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
  quantity: number;
  option?: { name: string; price: number };
  optionId: number | null;
}

// --- Restaurant ---
export interface Restaurant {
  id: number;
  name: string;
  address?: string;
  email: string;
  logoPath?: string;
  deliveryTime?: string;
  collectionTime?: string;
}

// --- Promo Code ---
export interface PromoCode {
  id: number;
  code: string;
  discountPercent?: number;
  discountAmount?: number;
  minOrderAmount?: number;
  maxUses?: number;
  currentUses: number;
  expiresAt: string | null;
  active: boolean;
  restaurantId: number | null;
}

// --- Promo Validation ---
export interface PromoValidationResponse {
  success: boolean;
  discountAmount: number;
  code: string;
}

// --- Order Item Input ---
export interface OrderItemInput {
  foodId: number;
  quantity: number;
  price: number;
  foodOptionId: number | null;
}

// --- Order Input ---
export interface OrderInput {
  totalAmount: number;
  deliveryType: "PICKUP" | "DELIVERY";
  paymentStatus: string;
  status: string;
  timeSlot: string;
  paymentMethod: "cash" | "card";
  postcode?: string;
  address?: string;
  orderNote?: string;
  customerId: number;
  restaurantId: number;
  deliveryFee: number;
  discountAmount: number;
  promoCode: string | null;
  items: OrderItemInput[];
}

// --- Order Item with Food ---
export type OrderItemWithFood = {
  id: number;
  quantity: number;
  price: Decimal;
  food: {
    id: number;
    name: string;
    description: string | null;
    image: string | null;
    price: Decimal;
  };
};

// --- Full Order with Items ---
export type OrderWithItems = {
  id: number;
  totalAmount: Decimal;
  finalAmount: Decimal | null;
  discountAmount: Decimal | null;
  timeSlot: string | null;
  address: string | null;
  postcode: string | null;
  status:
    | "PLACED"
    | "ACCEPTED"
    | "REJECTED"
    | "PREPARING"
    | "READY"
    | "DELIVERED";
  createdAt: Date;
  updatedAt: Date;
  items: OrderItemWithFood[];
  restaurant: {
    id: number;
    name: string;
    logoPath: string | null;
  };
};

export type OrderDetails = Omit<OrderWithItems, "restaurant">;

// --- Customer ---
export type Customer = {
  id: number;
  name: string | null;
  phone: string | null;
  address: string | null;
  postcode: string | null;
  totalSpent: number;
  orderCount: number;
  userId: number;
};

// --- Staff ---
export type Staff = {
  id: number | null; // ← nullable
  name: string | null;
  role: string; // ← string, not StaffRole (unless you import it)
  active: boolean;
};

// --- Expense ---
export type Expense = {
  id: number;
  description: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  receiptPath: string | null;
  recurring: boolean;
  notes: string | null;
  restaurantId: number | null;
  staffId: string | null;
  staff: { id: number; name: string; role: StaffRole } | null;
  updatedAt: string;
};

export type ExpenseFormValues = {
  id?: number;
  description: string;
  category: ExpenseCategory;
  amount: number;
  date: string; // YYYY-MM-DD
  recurring: boolean;
  notes: string | null;
  updatedAt: string;
  staffId: number | null;
  staff: { id: number; name: string; role: StaffRole } | null;
};

// --- User ---
export type User = {
  id: number;
  email: string;
  role: "ADMIN" | "STAFF" | "CUSTOMER" | "OWNER";
  createdAt: string;
  staff?: {
    id: number | null;
    name: string | null;
    role: string;
    active: boolean;
  } | null;
  customer?: {
    name: string | null;
    phone: string | null;
    address: string | null;
    postcode: string | null;
  } | null;
};

// --- ApiResponse ---
export type ApiResponse = {
  users: User[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
};

export type Reservation = {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  guests: number;
  startsAt: string;
  duration: number;
  notes: string | null;
  status: "CONFIRMED" | "CANCELLED" | "COMPLETED" | "PENDING";
  createdAt: string;
  table: { number: string } | null;
  tables: { table: { number: string } }[];
  restaurantId: number;
};

export type Table = {
  id: number;
  number: string;
  capacity: number;
};

// Match what the API returns from /api/admin/staff
export type ApiStaff = {
  id: number;
  name: string;
  role: StaffRole;
  email: string | null;
  phone: string | null;
  hireDate: string; // ISO string, not Date
  salary: number | null;
  hourlyRate: number | null;
  salaryPeriod: SalaryPeriod | null;
  active: boolean;
  notes: string | null;
  userId: number | null;
  due: number;
};

// Match what /api/admin/expenses/salary/history returns
export type SalaryPayment = {
  id: number;
  staffId: number;
  staffName: string;
  role: StaffRole;
  amount: number;
  date: string; // YYYY-MM-DD
  notes: string | null;
};

// For due calculation
export type StaffDuePayment = ApiStaff & {
  expected: number;
  paid: number;
  due: number;
};
