/** Sheet tab names and their column order. ensureTable creates/upgrades these on first use. */
export const TABS = {
  tags: "Tags",
  sizes: "ArticleSizes",
  orders: "OrderForms",
  orderItems: "OrderFormItems",
  bills: "Bills",
  billItems: "BillItems",
} as const;

const LINE = [
  "articleCode", "brand", "fabric", "supplierName", "supplierGstin", "supplierPhone",
  "size", "sizes", "pcsPerSet", "sets", "pieces", "rate",
];

export const HEADERS: Record<string, string[]> = {
  [TABS.tags]: [
    "id", "createdAt", "createdBy", "supplierName", "supplierAddress", "supplierPhone",
    "supplierEmail", "supplierGstin", "brand", "designNo", "fabric", "gsm", "color", "remarks",
    "imageUrl", "driveFileId", "driveWebLink",
  ],
  [TABS.sizes]: [
    "id", "tagId", "createdAt", "articleCode", "supplierName", "supplierGstin", "supplierPhone",
    "brand", "fabric", "size", "sizes", "pcsPerSet", "rate",
  ],
  [TABS.orders]: [
    "id", "orderNo", "createdAt", "createdBy", "customerName", "customerPhone", "customerGstin",
    "customerAddress", "status", "billId", "totalSets", "totalPieces", "totalAmount", "notes",
  ],
  [TABS.orderItems]: ["id", "orderId", "sizeId", ...LINE, "amount"],
  [TABS.bills]: [
    "id", "billNo", "orderId", "orderNo", "createdAt", "createdBy", "customerName", "customerPhone",
    "customerGstin", "customerAddress", "totalSets", "totalPieces", "grossAmount", "discountAmount",
    "taxableAmount", "cgstRate", "cgstAmount", "sgstRate", "sgstAmount", "roundOff", "total", "notes",
  ],
  [TABS.billItems]: [
    "id", "billId", "hsn", ...LINE, "grossAmount", "discountPct", "discountAmount", "taxableAmount",
  ],
};
