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
  /** Owning user. Every item route is scoped to the caller's own items. */
  owner_id: number;
  /** Nested data the bridge exposes by dot-path, except warehouse_bin. Absent on created items. */
  dimensions?: {
    width_cm: number;
    depth_cm: number;
    height_cm: number;
    weight_kg: number;
    warehouse_bin: string;
  };
  // Trap fields — internal data that should be stripped by field filters
  internal_code: string;
  supplier_id: number;
  cost_price: number;
  margin_pct: number;
  /** Nested trap object: none of its fields is allowlisted. */
  supplier?: { name: string; supplier_id: number; contact_email: string; unit_cost: number };
  /** Array of objects carrying trap fields: unreachable through the allowlist by design. */
  variants?: { sku: string; color: string; cost_price: number }[];
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

const KEYSTONE = { name: "Keystone Peripherals", supplier_id: 4012, contact_email: "orders@keystone-peripherals.example" };
const NORTHWIND = { name: "Northwind Audio", supplier_id: 4055, contact_email: "orders@northwind-audio.example" };
const OAKLINE = { name: "Oakline Furniture", supplier_id: 5100, contact_email: "sales@oakline-furniture.example" };
const PAPERLEAF = { name: "Paperleaf Supply", supplier_id: 6200, contact_email: "orders@paperleaf-supply.example" };
const BRIGHTLENS = { name: "Brightlens Optics", supplier_id: 7300, contact_email: "orders@brightlens-optics.example" };

/**
 * Seed items with trap fields included. Items 1-7 belong to `admin`; items 8-9 belong to
 * `user`, so each account has data the other must never see.
 */
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
    owner_id: 1,
    dimensions: { width_cm: 44, depth_cm: 13, height_cm: 4, weight_kg: 0.9, warehouse_bin: "WH-A03-14" },
    internal_code: "SKU-KB-7842",
    supplier_id: 4012,
    cost_price: 32.5,
    margin_pct: 59.4,
    supplier: { ...KEYSTONE, unit_cost: 32.5 },
    variants: [
      { sku: "SKU-KB-7842-BLK", color: "Black", cost_price: 32.5 },
      { sku: "SKU-KB-7842-WHT", color: "White", cost_price: 33.1 },
    ],
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
    owner_id: 1,
    dimensions: { width_cm: 61, depth_cm: 20, height_cm: 46, weight_kg: 6.2, warehouse_bin: "WH-A07-02" },
    internal_code: "SKU-MON-2201",
    supplier_id: 4012,
    cost_price: 210.0,
    margin_pct: 53.3,
    supplier: { ...KEYSTONE, unit_cost: 210.0 },
    variants: [{ sku: "SKU-MON-2201-SLV", color: "Silver", cost_price: 210.0 }],
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
    owner_id: 1,
    dimensions: { width_cm: 19, depth_cm: 8, height_cm: 22, weight_kg: 0.3, warehouse_bin: "WH-A05-09" },
    internal_code: "SKU-HP-3301",
    supplier_id: 4055,
    cost_price: 88.0,
    margin_pct: 56.0,
    supplier: { ...NORTHWIND, unit_cost: 88.0 },
    variants: [{ sku: "SKU-HP-3301-BLK", color: "Black", cost_price: 88.0 }],
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
    owner_id: 1,
    dimensions: { width_cm: 160, depth_cm: 80, height_cm: 125, weight_kg: 38.0, warehouse_bin: "WH-C01-01" },
    internal_code: "SKU-DSK-4401",
    supplier_id: 5100,
    cost_price: 280.0,
    margin_pct: 53.3,
    supplier: { ...OAKLINE, unit_cost: 280.0 },
    variants: [
      { sku: "SKU-DSK-4401-OAK", color: "Oak", cost_price: 280.0 },
      { sku: "SKU-DSK-4401-WAL", color: "Walnut", cost_price: 295.0 },
    ],
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
    owner_id: 1,
    dimensions: { width_cm: 66, depth_cm: 66, height_cm: 120, weight_kg: 17.5, warehouse_bin: "WH-C02-06" },
    internal_code: "SKU-CHR-5501",
    supplier_id: 5100,
    cost_price: 155.0,
    margin_pct: 55.7,
    supplier: { ...OAKLINE, unit_cost: 155.0 },
    variants: [{ sku: "SKU-CHR-5501-GRY", color: "Grey", cost_price: 155.0 }],
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
    owner_id: 1,
    dimensions: { width_cm: 15, depth_cm: 2, height_cm: 21, weight_kg: 0.35, warehouse_bin: "WH-B12-07" },
    internal_code: "SKU-NB-6601",
    supplier_id: 6200,
    cost_price: 3.2,
    margin_pct: 75.4,
    supplier: { ...PAPERLEAF, unit_cost: 3.2 },
    variants: [{ sku: "SKU-NB-6601-DOT", color: "Dotted", cost_price: 3.2 }],
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
    owner_id: 1,
    dimensions: { width_cm: 16, depth_cm: 2, height_cm: 9, weight_kg: 0.2, warehouse_bin: "WH-B12-11" },
    internal_code: "SKU-PEN-7701",
    supplier_id: 6200,
    cost_price: 2.1,
    margin_pct: 76.6,
    supplier: { ...PAPERLEAF, unit_cost: 2.1 },
    variants: [{ sku: "SKU-PEN-7701-AST", color: "Assorted", cost_price: 2.1 }],
  },
  {
    id: 8,
    name: "Kestrel Webcam",
    description: "1080p webcam with dual noise-reducing microphones",
    category_id: 1,
    price: 129.99,
    stock: 60,
    status: "active",
    created_at: "2025-02-18T09:30:00Z",
    updated_at: "2025-03-08T13:00:00Z",
    owner_id: 2,
    dimensions: { width_cm: 10, depth_cm: 6, height_cm: 5, weight_kg: 0.2, warehouse_bin: "WH-A09-03" },
    internal_code: "SKU-CAM-8801",
    supplier_id: 7300,
    cost_price: 54.0,
    margin_pct: 58.5,
    supplier: { ...BRIGHTLENS, unit_cost: 54.0 },
    variants: [{ sku: "SKU-CAM-8801-BLK", color: "Black", cost_price: 54.0 }],
  },
  {
    id: 9,
    name: "Aurora Desk Lamp",
    description: "Dimmable LED desk lamp with adjustable colour temperature",
    category_id: 2,
    price: 69.99,
    stock: 90,
    status: "active",
    created_at: "2025-02-22T11:00:00Z",
    updated_at: "2025-03-14T10:15:00Z",
    owner_id: 2,
    dimensions: { width_cm: 18, depth_cm: 18, height_cm: 45, weight_kg: 1.4, warehouse_bin: "WH-C04-08" },
    internal_code: "SKU-LMP-9901",
    supplier_id: 7300,
    cost_price: 24.5,
    margin_pct: 65.0,
    supplier: { ...BRIGHTLENS, unit_cost: 24.5 },
    variants: [{ sku: "SKU-LMP-9901-BRS", color: "Brass", cost_price: 24.5 }],
  },
];

let nextItemId = items.length + 1;

/** Generate the next item ID. */
export function getNextItemId(): number {
  return nextItemId++;
}
