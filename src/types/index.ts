// types/index.ts
import { ExpenseCategory, SalaryPeriod, StaffRole } from "@prisma/client";



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
  price: number;
  food: {
    id: number;
    name: string;
    description: string | null;
    image: string | null;
    price: number;
  };
};

// --- Full Order with Items ---
export type OrderWithItems = {
  id: number;
  totalAmount: number;
  finalAmount: number | null;
  discountAmount: number | null;
  timeSlot: string | null;
  address: string | null;
  postcode: string | null;
  status: "placed" | "accepted" | "rejected" | "preparing" | "ready" | "delivered";
  createdAt: string;
  updatedAt: string;
  items: OrderItemWithFood[];
  restaurant: {
    id: number;
    name: string;
    logoPath: string | null;
  };
};

export type OrderDetails = Omit<OrderWithItems, 'restaurant'>;

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
  id: number;
  name: string;
  role: StaffRole;
  email: string | null;
  phone: string | null;
  hireDate: string;
  salary: number | null;
  hourlyRate: number | null;
  salaryPeriod: SalaryPeriod | null;
  active: boolean;
  notes: string | null;
  restaurantId: number;
  updatedAt: string;
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
  restaurantId: number|null;
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

// --- Salary Payment History ---
export type SalaryPayment = {
  id: number;
  staffId: number;
  staffName: string;
  role: StaffRole;
  amount: number;
  date: string;
  notes: string | null;
};

// --- Staff Due Payment ---
export type StaffDuePayment = {
  id: number;
  name: string;
  role: StaffRole;
  expected: number;
  paid: number;
  due: number;
};

// --- User ---
export type User = {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "CUSTOMER" | "KITCHEN";
  restaurantId: number | null;
};

// --- Helper Types ---
export type StaffWithExpenses = {
  id: number;
  name: string;
  role: StaffRole;
  salary: number | null;
  hourlyRate: number | null;
  salaryPeriod: SalaryPeriod | null;
  expenses: {
    amount: number;
    date: string;
  }[];
};

export type PrismaExpenseWithStaff = {
  id: number;
  amount: number;
  date: string;
  notes: string | null;
  staffId: number | null;
  staff: { name: string; role: StaffRole } | null;
};