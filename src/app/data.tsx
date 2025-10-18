// types/navbar.ts or lib/navbar.ts
export interface Link {
  id: number;
  title: string;
  url: string;
}

export const customerLinks: Link[] = [
  { id: 1, title: "Home", url: "/" },
  { id: 2, title: "My Orders", url: "/orders" },
  { id: 3, title: "Table Reservation", url: "/reserve" },
  { id: 4, title: "Profile", url: "/profile" },
];

export const kitchenLinks: Link[] = [
  { id: 1, title: "Home", url: "/" },
  { id: 2, title: "Orders", url: "/kitchen" },
];

export const waiterLinks: Link[] = [
  { id: 1, title: "Home", url: "/waiter" },
  { id: 2, title: "New Order", url: "/waiter/new" },
];

export const adminLinks: Link[] = [
  { id: 1, title: "Home", url: "/admin" },
  { id: 2, title: "Orders", url: "/admin/orders" },
  { id: 3, title: "Category", url: "/admin/category" },
  { id: 4, title: "Foods", url: "/admin/food" },
  { id: 5, title: "Staff", url: "/admin/staff" },
  { id: 6, title: "Delivery Fee", url: "/admin/delivery-zones" },
  { id: 7, title: "Time", url: "/admin/restaurants" },
  { id: 8, title: "Promocode", url: "/admin/promocodes" },
  { id: 9, title: "Add Order", url: "/waiter/new" },
  { id: 10, title: "Finance", url: "/admin/finance" },
  { id: 11, title: "Tables", url: "/admin/tables" },
];

export const defaultLinks: Link[] = [
  { id: 1, title: "Home", url: "/" },
  { id: 3, title: "Contact Us", url: "/contact" },
];
