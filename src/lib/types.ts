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

/** One supplier tag = one article (design). */
export type Tag = {
  id: string;
  createdAt: string;
  createdBy: string;
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

/** One size set of an article with its rate, e.g. KW-1170 sizes 22-28 at Rs 260 a piece. */
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
};

/** Fields every order and bill line carries, copied at the time of sale so later edits to the article do not rewrite history. */
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

export type OrderStatus = "open" | "billed";

export type Order = {
  id: string;
  orderNo: string;
  createdAt: string;
  createdBy: string;
  customerName: string;
  customerPhone: string;
  customerGstin: string;
  customerAddress: string;
  status: OrderStatus;
  billId: string;
  totalSets: number;
  totalPieces: number;
  totalAmount: number;
  notes: string;
};

export type OrderItem = LineBase & {
  id: string;
  orderId: string;
  sizeId: string;
  amount: number;
};

export type Bill = {
  id: string;
  billNo: string;
  orderId: string;
  orderNo: string;
  createdAt: string;
  createdBy: string;
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

export type BillItem = LineBase & {
  id: string;
  billId: string;
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
