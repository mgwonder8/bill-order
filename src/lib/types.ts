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

/** A supplier order (purchase order), usually made from the day's compiled customer orders. */
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

/** An order form taken from a customer. It can be billed on the spot or later. */
export type CustomerOrder = {
  id: string;
  orderNo: string;
  createdAt: string;
  createdBy: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerGstin: string;
  customerAddress: string;
  status: "open" | "billed";
  billId: string;
  totalSets: number;
  totalPieces: number;
  totalAmount: number;
  notes: string;
};

/** `rate` is the selling price per piece; `pieces` is editable and defaults to sets x pieces per set. */
export type CustomerOrderItem = LineBase & {
  id: string;
  orderId: string;
  sizeId: string;
  amount: number;
};

/** with = 5% GST added on top (CGST + SGST); without = plain bill, no GST. */
export type GstMode = "with" | "without";

/** A customer bill, made from a customer order form. */
export type Bill = {
  id: string;
  billNo: string;
  orderId: string;
  orderNo: string;
  gstMode: GstMode;
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

/** `rate` is the selling price per piece, `costRate` the supplier's rate. */
export type BillItem = LineBase & {
  id: string;
  billId: string;
  sizeId: string;
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
  /** Town printed as "Subject to ... jurisdiction" at the top of bills. */
  jurisdiction: string;
  bank: string;
};
