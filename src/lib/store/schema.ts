/** Logical table names used by the data layer. */
export const TABS = {
  tags: "Tags",
  sizes: "ArticleSizes",
  orders: "OrderForms",
  orderItems: "OrderFormItems",
  bills: "Bills",
  billItems: "BillItems",
} as const;

export type ColumnType = "text" | "int" | "num" | "ts" | "ref";
export type Column = { key: string; col: string; type: ColumnType };
export type TableDef = { table: string; columns: Column[] };

const snake = (key: string) => key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

/** `ref` is text that is NULL when empty (a foreign key or a link that is filled in later). */
const c = (key: string, type: ColumnType = "text", col = snake(key)): Column => ({ key, col, type });

const LINE: Column[] = [
  c("articleCode"), c("brand"), c("fabric"), c("supplierName"), c("supplierGstin"), c("supplierPhone"),
  c("size"), c("sizes"), c("pcsPerSet", "int"), c("sets", "int"), c("pieces", "int"), c("rate", "num"),
];

/**
 * Maps the app's field names to the columns in supabase/schema.sql. Fields not listed
 * here are not stored (the old driveWebLink is intentionally dropped).
 */
export const TABLE_DEFS: Record<string, TableDef> = {
  [TABS.tags]: {
    table: "tags",
    columns: [
      c("id"), c("createdAt", "ts"), c("createdBy"), c("supplierName"), c("supplierAddress"), c("supplierPhone"),
      c("supplierEmail"), c("supplierGstin"), c("brand"), c("designNo"), c("fabric"), c("gsm"), c("color"),
      c("remarks"), c("imageUrl"), c("driveFileId", "text", "photo_name"),
    ],
  },
  [TABS.sizes]: {
    table: "article_sizes",
    columns: [
      c("id"), c("tagId"), c("createdAt", "ts"), c("articleCode"), c("supplierName"), c("supplierGstin"),
      c("supplierPhone"), c("brand"), c("fabric"), c("size"), c("sizes"), c("pcsPerSet", "int"), c("rate", "num"),
    ],
  },
  [TABS.orders]: {
    table: "orders",
    columns: [
      c("id"), c("orderNo"), c("createdAt", "ts"), c("createdBy"), c("customerName"), c("customerPhone"),
      c("customerGstin"), c("customerAddress"), c("status"), c("billId", "ref"), c("totalSets", "int"),
      c("totalPieces", "int"), c("totalAmount", "num"), c("notes"),
    ],
  },
  [TABS.orderItems]: {
    table: "order_items",
    columns: [c("id"), c("orderId"), c("sizeId", "ref"), ...LINE, c("amount", "num")],
  },
  [TABS.bills]: {
    table: "bills",
    columns: [
      c("id"), c("billNo"), c("orderId", "ref"), c("orderNo"), c("createdAt", "ts"), c("createdBy"),
      c("customerName"), c("customerPhone"), c("customerGstin"), c("customerAddress"), c("totalSets", "int"),
      c("totalPieces", "int"), c("grossAmount", "num"), c("discountAmount", "num"), c("taxableAmount", "num"),
      c("cgstRate", "num"), c("cgstAmount", "num"), c("sgstRate", "num"), c("sgstAmount", "num"),
      c("roundOff", "num"), c("total", "num"), c("notes"),
    ],
  },
  [TABS.billItems]: {
    table: "bill_items",
    columns: [
      c("id"), c("billId"), c("hsn"), ...LINE, c("grossAmount", "num"), c("discountPct", "num"),
      c("discountAmount", "num"), c("taxableAmount", "num"),
    ],
  },
};
