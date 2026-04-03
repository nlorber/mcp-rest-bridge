export interface Item {
  id: number;
  name: string;
  description: string;
  category_id: number;
  price: number;
  stock: number;
  status: "active" | "inactive" | "discontinued";
  created_at: string;
  updated_at: string;
  // Trap fields — internal data that should be stripped by field filters
  internal_code: string;
  supplier_id: number;
  cost_price: number;
  margin_pct: number;
}

export interface Category {
  id: number;
  name: string;
  description: string;
  item_count: number;
  // Trap fields
  internal_code: string;
  sort_order: number;
}

export interface User {
  id: number;
  username: string;
  password: string;
  role: "admin" | "user";
}

/** Seed users for mock auth. */
export const users: User[] = [
  { id: 1, username: "admin", password: "admin123", role: "admin" },
  { id: 2, username: "user", password: "user123", role: "user" },
];

/** Seed categories. */
export const categories: Category[] = [
  {
    id: 1,
    name: "Electronics",
    description: "Electronic devices and accessories",
    item_count: 3,
    internal_code: "CAT-ELEC-001",
    sort_order: 10,
  },
  {
    id: 2,
    name: "Furniture",
    description: "Office and home furniture",
    item_count: 2,
    internal_code: "CAT-FURN-002",
    sort_order: 20,
  },
  {
    id: 3,
    name: "Stationery",
    description: "Office supplies and stationery items",
    item_count: 2,
    internal_code: "CAT-STAT-003",
    sort_order: 30,
  },
];

/** Seed items with trap fields included. */
export const items: Item[] = [
  {
    id: 1,
    name: "Wireless Keyboard",
    description: "Bluetooth mechanical keyboard with RGB lighting",
    category_id: 1,
    price: 79.99,
    stock: 150,
    status: "active",
    created_at: "2025-01-15T10:00:00Z",
    updated_at: "2025-03-01T14:30:00Z",
    internal_code: "SKU-KB-7842",
    supplier_id: 4012,
    cost_price: 32.5,
    margin_pct: 59.4,
  },
  {
    id: 2,
    name: "USB-C Monitor",
    description: '27" 4K monitor with USB-C power delivery',
    category_id: 1,
    price: 449.99,
    stock: 42,
    status: "active",
    created_at: "2025-01-20T08:00:00Z",
    updated_at: "2025-02-28T16:00:00Z",
    internal_code: "SKU-MON-2201",
    supplier_id: 4012,
    cost_price: 210.0,
    margin_pct: 53.3,
  },
  {
    id: 3,
    name: "Noise-Cancelling Headphones",
    description: "Over-ear headphones with active noise cancellation",
    category_id: 1,
    price: 199.99,
    stock: 85,
    status: "active",
    created_at: "2025-02-01T09:00:00Z",
    updated_at: "2025-03-10T11:00:00Z",
    internal_code: "SKU-HP-3301",
    supplier_id: 4055,
    cost_price: 88.0,
    margin_pct: 56.0,
  },
  {
    id: 4,
    name: "Standing Desk",
    description: "Electric height-adjustable standing desk, 160cm",
    category_id: 2,
    price: 599.99,
    stock: 20,
    status: "active",
    created_at: "2025-01-10T07:00:00Z",
    updated_at: "2025-02-15T10:00:00Z",
    internal_code: "SKU-DSK-4401",
    supplier_id: 5100,
    cost_price: 280.0,
    margin_pct: 53.3,
  },
  {
    id: 5,
    name: "Ergonomic Chair",
    description: "Mesh office chair with lumbar support and adjustable armrests",
    category_id: 2,
    price: 349.99,
    stock: 35,
    status: "active",
    created_at: "2025-01-25T12:00:00Z",
    updated_at: "2025-03-05T09:00:00Z",
    internal_code: "SKU-CHR-5501",
    supplier_id: 5100,
    cost_price: 155.0,
    margin_pct: 55.7,
  },
  {
    id: 6,
    name: "Notebook A5",
    description: "Hardcover dotted notebook, 200 pages",
    category_id: 3,
    price: 12.99,
    stock: 500,
    status: "active",
    created_at: "2025-02-10T06:00:00Z",
    updated_at: "2025-02-10T06:00:00Z",
    internal_code: "SKU-NB-6601",
    supplier_id: 6200,
    cost_price: 3.2,
    margin_pct: 75.4,
  },
  {
    id: 7,
    name: "Ballpoint Pen Set",
    description: "Pack of 12 premium ballpoint pens, assorted colors",
    category_id: 3,
    price: 8.99,
    stock: 300,
    status: "inactive",
    created_at: "2025-01-05T08:00:00Z",
    updated_at: "2025-03-12T15:00:00Z",
    internal_code: "SKU-PEN-7701",
    supplier_id: 6200,
    cost_price: 2.1,
    margin_pct: 76.6,
  },
];

let nextItemId = items.length + 1;

/** Generate the next item ID. */
export function getNextItemId(): number {
  return nextItemId++;
}
