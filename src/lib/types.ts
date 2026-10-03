export type SizeRate = { sizes: string[]; rate: number };

/** What the vision model reads off a tag photo, before a human confirms it. */
export type TagExtract = {
  supplierName: string;
  supplierAddress: string;
  supplierPhone: string;
  supplierEmail: string;
  supplierGstin: string;
  brand: string;
  designNo: string;
  fabric: string;
  gsm: string;
  color: string;
  sizeRates: SizeRate[];
  remarks: string;
  confidence: "high" | "medium" | "low";
  warnings: string[];
};

/** Who the shop buys from. Built from the tags it scans. */
export type Supplier = {
  id: string;
  createdAt: string;
  name: string;
  gstin: string;
  phone: string;
  email: string;
  address: string;
};

/** Who the shop sells to. Built from the bills it makes. */
export type Customer = {
  id: string;
  createdAt: string;
  name: string;
  phone: string;
  gstin: string;
  address: string;
};

/** One supplier tag = one article (design). */
export type Tag = {
  id: string;
  createdAt: string;
  createdBy: string;
  supplierId: string;
  supplierName: string;
  supplierAddress: string;
  supplierPhone: string;
  supplierEmail: string;
  supplierGstin: string;
  brand: string;
  designNo: string;
  fabric: string;
  gsm: string;
  color: string;
  remarks: string;
  imageUrl: string;
  driveFileId: string;
  driveWebLink: string;
};

/**
 * One size range of an article, e.g. KW-1170 sizes 22-28. `rate` is what the supplier
 * charges per piece (from the tag); `sellRate` is the shop's selling price per piece.
 */
export type ArticleSize = {
  id: string;
  tagId: string;
  createdAt: string;
  articleCode: string;
  supplierName: string;
  supplierGstin: string;
  supplierPhone: string;
  brand: string;
  fabric: string;
  size: string;
  sizes: string;
  pcsPerSet: number;
  rate: number;
  sellRate: number;
};

/** An article size with its live stock: pieces ordered from the supplier minus pieces billed. */
export type StockItem = ArticleSize & { orderedPieces: number; soldPieces: number; inStock: number };

/** Article fields every order and bill line carries, copied at the time so later edits do not rewrite history. */
export type LineBase = {
  articleCode: string;
  brand: string;
  fabric: string;
  supplierName: string;
  supplierGstin: string;
  supplierPhone: string;
  size: string;
  sizes: string;
  pcsPerSet: number;
  sets: number;
  pieces: number;
  rate: number;
};

/** A supplier order (purchase order). Saving it adds its pieces to stock. */
export type Order = {
  id: string;
  orderNo: string;
  createdAt: string;
  createdBy: string;
  supplierId: string;
  supplierName: string;
  supplierPhone: string;
  supplierGstin: string;
  supplierAddress: string;
  totalSets: number;
  totalPieces: number;
  totalAmount: number;
  notes: string;
};

/** `rate` is the supplier's rate per piece; `sellRate` the selling price set while ordering. */
export type OrderItem = LineBase & {
  id: string;
  orderId: string;
  sizeId: string;
  amount: number;
  sellRate: number;
};

/** A customer bill (GST tax invoice), made from stock. */
export type Bill = {
  id: string;
  billNo: string;
  createdAt: string;
  createdBy: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerGstin: string;
  customerAddress: string;
  totalSets: number;
  totalPieces: number;
  grossAmount: number;
  discountAmount: number;
  taxableAmount: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  roundOff: number;
  total: number;
  notes: string;
};

/**
 * `sets` full sets plus `loosePieces`; `pieces` is the total. `rate` is the selling price
 * per piece, `costRate` the supplier's rate (kept for the daily supplier report).
 */
export type BillItem = LineBase & {
  id: string;
  billId: string;
  sizeId: string;
  loosePieces: number;
  costRate: number;
  hsn: string;
  grossAmount: number;
  discountPct: number;
  discountAmount: number;
  taxableAmount: number;
};

/** The shop block printed on every document, passed from the server to client PDF builders. */
export type ShopInfo = {
  name: string;
  address: string;
  gstin: string;
  phone: string;
  email: string;
  state: string;
  bank: string;
};
