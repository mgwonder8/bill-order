/** Logical table names used by the data layer. */
export const TABS = {
  suppliers: "Suppliers",
  customers: "Customers",
  tags: "Tags",
  sizes: "ArticleSizes",
  orders: "SupplierOrders",
  orderItems: "SupplierOrderItems",
  bills: "Bills",
  billItems: "BillItems",
} as const;

export type ColumnType = "text" | "int" | "num" | "ts" | "ref";
export type Column = { key: string; col: string; type: ColumnType };
export type TableDef = { table: string; columns: Column[] };

const snake = (key: string) => key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

/** `ref` is text that is NULL when empty (a foreign key or a link that may be missing). */
const c = (key: string, type: ColumnType = "text", col = snake(key)): Column => ({ key, col, type });

const ARTICLE: Column[] = [
  c("articleCode"), c("brand"), c("fabric"), c("supplierName"), c("supplierGstin"), c("supplierPhone"),
  c("size"), c("sizes"), c("pcsPerSet", "int"),
];

/** Maps the app's field names to the columns in supabase/schema.sql. Fields not listed are not stored. */
export const TABLE_DEFS: Record<string, TableDef> = {
  [TABS.suppliers]: {
    table: "suppliers",
    columns: [c("id"), c("createdAt", "ts"), c("name"), c("gstin"), c("phone"), c("email"), c("address")],
  },
  [TABS.customers]: {
    table: "customers",
    columns: [c("id"), c("createdAt", "ts"), c("name"), c("phone"), c("gstin"), c("address")],
  },
  [TABS.tags]: {
    table: "tags",
    columns: [
      c("id"), c("createdAt", "ts"), c("createdBy"), c("supplierId", "ref"), c("supplierName"), c("supplierAddress"),
      c("supplierPhone"), c("supplierEmail"), c("supplierGstin"), c("brand"), c("designNo"), c("fabric"), c("gsm"),
      c("color"), c("remarks"), c("imageUrl"), c("driveFileId", "text", "photo_name"),
    ],
  },
  [TABS.sizes]: {
    table: "article_sizes",
    columns: [c("id"), c("tagId"), c("createdAt", "ts"), ...ARTICLE, c("rate", "num"), c("sellRate", "num")],
  },
  [TABS.orders]: {
    table: "supplier_orders",
    columns: [
      c("id"), c("orderNo"), c("createdAt", "ts"), c("createdBy"), c("supplierId", "ref"), c("supplierName"),
      c("supplierPhone"), c("supplierGstin"), c("supplierAddress"), c("totalSets", "int"), c("totalPieces", "int"),
      c("totalAmount", "num"), c("notes"),
    ],
  },
  [TABS.orderItems]: {
    table: "supplier_order_items",
    columns: [
      c("id"), c("orderId"), c("sizeId", "ref"), ...ARTICLE, c("sets", "int"), c("pieces", "int"), c("rate", "num"),
      c("amount", "num"), c("sellRate", "num"),
    ],
  },
  [TABS.bills]: {
    table: "bills",
    columns: [
      c("id"), c("billNo"), c("createdAt", "ts"), c("createdBy"), c("customerId", "ref"), c("customerName"),
      c("customerPhone"), c("customerGstin"), c("customerAddress"), c("totalSets", "int"), c("totalPieces", "int"),
      c("grossAmount", "num"), c("discountAmount", "num"), c("taxableAmount", "num"), c("cgstRate", "num"),
      c("cgstAmount", "num"), c("sgstRate", "num"), c("sgstAmount", "num"), c("roundOff", "num"), c("total", "num"),
      c("notes"),
    ],
  },
  [TABS.billItems]: {
    table: "bill_items",
    columns: [
      c("id"), c("billId"), c("sizeId", "ref"), c("hsn"), ...ARTICLE, c("sets", "int"), c("loosePieces", "int"),
      c("pieces", "int"), c("rate", "num"), c("costRate", "num"), c("grossAmount", "num"), c("discountPct", "num"),
      c("discountAmount", "num"), c("taxableAmount", "num"),
    ],
  },
};
