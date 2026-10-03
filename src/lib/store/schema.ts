/** Logical table names. All of them are stored as rows in public.tagbill_rows, keyed by this name. */
export const TABS = {
  tags: "Tags",
  sizes: "ArticleSizes",
  orders: "OrderForms",
  orderItems: "OrderFormItems",
  bills: "Bills",
  billItems: "BillItems",
} as const;
