import { appendRow, appendRows, clearRow, findRowById, readTable, updateRow } from "@/lib/store/table";
import { TABS } from "@/lib/store/schema";
import type { TableRow } from "@/lib/store/table-types";
import { billMoney, lineMoney, money, num } from "@/lib/money";
import { newId, nextDocNumber } from "@/lib/ids";
import { istDay } from "@/lib/dates";
import { SET_PCS } from "@/lib/sets";
import type { ArticleSize, Bill, BillItem, Customer, LineBase, Order, OrderItem, StockItem, Supplier, Tag } from "@/lib/types";

function toRow(obj: object): TableRow {
  const row: TableRow = {};
  for (const [k, v] of Object.entries(obj)) row[k] = v === null || v === undefined ? "" : String(v);
  return row;
}

function s(v: string | undefined): string {
  return v ?? "";
}

const norm = (v: string) => v.trim().toUpperCase().replace(/\s+/g, " ");
const same = (a: string, b: string) => norm(a) === norm(b);
const phoneKey = (v: string) => v.replace(/\D/g, "").slice(-10);

/** Latest non-empty value wins, so a better scan or bill fills in what was missing. */
function merge<T extends Record<string, string>>(current: T, incoming: Partial<T>): { next: T; changed: boolean } {
  const next = { ...current };
  let changed = false;
  for (const [k, v] of Object.entries(incoming)) {
    if (typeof v === "string" && v.trim() && v.trim() !== current[k as keyof T]) {
      (next as Record<string, string>)[k] = v.trim();
      changed = true;
    }
  }
  return { next, changed };
}

// ---------- Suppliers and customers (kept separate) ----------

function rowToSupplier(d: TableRow): Supplier {
  return { id: d.id, createdAt: s(d.createdAt), name: s(d.name), gstin: s(d.gstin), phone: s(d.phone), email: s(d.email), address: s(d.address) };
}

function rowToCustomer(d: TableRow): Customer {
  return { id: d.id, createdAt: s(d.createdAt), name: s(d.name), phone: s(d.phone), gstin: s(d.gstin), address: s(d.address) };
}

export async function listSuppliers(): Promise<Supplier[]> {
  const { rows } = await readTable(TABS.suppliers);
  return rows.map((r) => rowToSupplier(r.data)).sort((a, b) => a.name.localeCompare(b.name));
}

export async function listCustomers(): Promise<Customer[]> {
  const { rows } = await readTable(TABS.customers);
  return rows.map((r) => rowToCustomer(r.data)).sort((a, b) => a.name.localeCompare(b.name));
}

async function upsertSupplier(input: Omit<Supplier, "id" | "createdAt">): Promise<Supplier> {
  const { rows } = await readTable(TABS.suppliers);
  const row = rows.find((r) => same(r.data.name ?? "", input.name));
  if (row) {
    const current = rowToSupplier(row.data);
    const { next, changed } = merge(current as unknown as Record<string, string>, { gstin: input.gstin, phone: input.phone, email: input.email, address: input.address });
    if (changed) await updateRow(TABS.suppliers, row.rowNumber, toRow(next));
    return next as unknown as Supplier;
  }
  const created: Supplier = { ...input, name: input.name.trim(), id: newId("sup"), createdAt: new Date().toISOString() };
  await appendRow(TABS.suppliers, toRow(created));
  return created;
}

/** Customers are matched by phone number when there is one, otherwise by name. */
async function upsertCustomer(input: Omit<Customer, "id" | "createdAt">): Promise<Customer> {
  const { rows } = await readTable(TABS.customers);
  const phone = phoneKey(input.phone);
  const row = phone
    ? rows.find((r) => phoneKey(r.data.phone ?? "") === phone)
    : rows.find((r) => !phoneKey(r.data.phone ?? "") && same(r.data.name ?? "", input.name));
  if (row) {
    const current = rowToCustomer(row.data);
    const { next, changed } = merge(current as unknown as Record<string, string>, { name: input.name, gstin: input.gstin, address: input.address, phone: input.phone });
    if (changed) await updateRow(TABS.customers, row.rowNumber, toRow(next));
    return next as unknown as Customer;
  }
  const created: Customer = { ...input, name: input.name.trim(), id: newId("cus"), createdAt: new Date().toISOString() };
  await appendRow(TABS.customers, toRow(created));
  return created;
}

// ---------- Tags (articles) and their size ranges ----------

function rowToTag(d: TableRow): Tag {
  return {
    id: d.id,
    createdAt: s(d.createdAt),
    createdBy: s(d.createdBy),
    supplierId: s(d.supplierId),
    supplierName: s(d.supplierName),
    supplierAddress: s(d.supplierAddress),
    supplierPhone: s(d.supplierPhone),
    supplierEmail: s(d.supplierEmail),
    supplierGstin: s(d.supplierGstin),
    brand: s(d.brand),
    designNo: s(d.designNo),
    fabric: s(d.fabric),
    gsm: s(d.gsm),
    color: s(d.color),
    remarks: s(d.remarks),
    imageUrl: s(d.imageUrl),
    driveFileId: s(d.driveFileId),
    driveWebLink: s(d.driveWebLink),
  };
}

function rowToSize(d: TableRow): ArticleSize {
  return {
    id: d.id,
    tagId: s(d.tagId),
    createdAt: s(d.createdAt),
    articleCode: s(d.articleCode),
    supplierName: s(d.supplierName),
    supplierGstin: s(d.supplierGstin),
    supplierPhone: s(d.supplierPhone),
    brand: s(d.brand),
    fabric: s(d.fabric),
    size: s(d.size),
    sizes: s(d.sizes),
    pcsPerSet: num(d.pcsPerSet) || SET_PCS,
    rate: num(d.rate),
    sellRate: num(d.sellRate),
  };
}

export async function listTags(): Promise<Tag[]> {
  const { rows } = await readTable(TABS.tags);
  return rows.map((r) => rowToTag(r.data)).reverse();
}

export async function getTag(id: string): Promise<{ tag: Tag; sizes: StockItem[] } | null> {
  const row = await findRowById(TABS.tags, id);
  if (!row) return null;
  const sizes = (await listStock()).filter((z) => z.tagId === id);
  return { tag: rowToTag(row.data), sizes };
}

export async function listSizes(): Promise<ArticleSize[]> {
  const { rows } = await readTable(TABS.sizes);
  return rows.map((r) => rowToSize(r.data));
}

/**
 * Saves a confirmed tag as an article plus one row per size range, and records the
 * supplier. Scanning the same article from the same supplier again reuses it: the
 * supplier rate is updated to the latest tag, the selling price is kept.
 */
export async function saveTag(input: {
  tag: Omit<Tag, "id" | "createdAt" | "supplierId">;
  sets: { size: string; sizes: string; rate: number }[];
}): Promise<{ tagId: string; sizes: ArticleSize[] }> {
  const createdAt = new Date().toISOString();
  const supplier = await upsertSupplier({
    name: input.tag.supplierName,
    gstin: input.tag.supplierGstin,
    phone: input.tag.supplierPhone,
    email: input.tag.supplierEmail,
    address: input.tag.supplierAddress,
  });

  const existing = (await listTags()).find((t) => same(t.designNo, input.tag.designNo) && same(t.supplierName, input.tag.supplierName));
  const tagId = existing?.id ?? newId("tag");
  if (!existing) await appendRow(TABS.tags, toRow({ ...input.tag, supplierName: supplier.name, id: tagId, createdAt, supplierId: supplier.id }));

  const { rows } = await readTable(TABS.sizes);
  const result: ArticleSize[] = [];
  const fresh: ArticleSize[] = [];
  for (const z of input.sets) {
    const row = rows.find((r) => r.data.tagId === tagId && r.data.size === z.size);
    if (row) {
      const current = rowToSize(row.data);
      const updated = { ...current, rate: money(z.rate), supplierGstin: supplier.gstin, supplierPhone: supplier.phone };
      if (updated.rate !== current.rate || updated.supplierGstin !== current.supplierGstin || updated.supplierPhone !== current.supplierPhone) {
        await updateRow(TABS.sizes, row.rowNumber, toRow(updated));
      }
      result.push(updated);
      continue;
    }
    const created: ArticleSize = {
      id: newId("siz"),
      tagId,
      createdAt,
      articleCode: existing?.designNo ?? input.tag.designNo,
      supplierName: supplier.name,
      supplierGstin: supplier.gstin,
      supplierPhone: supplier.phone,
      brand: input.tag.brand,
      fabric: input.tag.fabric,
      size: z.size,
      sizes: z.sizes,
      pcsPerSet: SET_PCS,
      rate: money(z.rate),
      sellRate: 0,
    };
    fresh.push(created);
    result.push(created);
  }
  if (fresh.length > 0) await appendRows(TABS.sizes, fresh.map(toRow));
  return { tagId, sizes: result };
}

/** Sets the selling price per piece of one article size range. */
export async function setSellRate(sizeId: string, sellRate: number): Promise<boolean> {
  const row = await findRowById(TABS.sizes, sizeId);
  if (!row) return false;
  await updateRow(TABS.sizes, row.rowNumber, toRow({ ...rowToSize(row.data), sellRate: money(sellRate) }));
  return true;
}

// ---------- Stock: pieces ordered from suppliers minus pieces billed ----------

export async function listStock(): Promise<StockItem[]> {
  const [sizes, orderItems, billItems] = await Promise.all([listSizes(), readTable(TABS.orderItems), readTable(TABS.billItems)]);
  const ordered = new Map<string, number>();
  const sold = new Map<string, number>();
  for (const r of orderItems.rows) ordered.set(r.data.sizeId, (ordered.get(r.data.sizeId) ?? 0) + num(r.data.pieces));
  for (const r of billItems.rows) sold.set(r.data.sizeId, (sold.get(r.data.sizeId) ?? 0) + num(r.data.pieces));
  return sizes.map((z) => {
    const orderedPieces = ordered.get(z.id) ?? 0;
    const soldPieces = sold.get(z.id) ?? 0;
    return { ...z, orderedPieces, soldPieces, inStock: orderedPieces - soldPieces };
  });
}

// ---------- Shared line fields ----------

function rowToLine(d: TableRow): LineBase {
  return {
    articleCode: s(d.articleCode),
    brand: s(d.brand),
    fabric: s(d.fabric),
    supplierName: s(d.supplierName),
    supplierGstin: s(d.supplierGstin),
    supplierPhone: s(d.supplierPhone),
    size: s(d.size),
    sizes: s(d.sizes),
    pcsPerSet: num(d.pcsPerSet) || SET_PCS,
    sets: num(d.sets),
    pieces: num(d.pieces),
    rate: num(d.rate),
  };
}

function articleFields(z: ArticleSize) {
  return {
    articleCode: z.articleCode,
    brand: z.brand,
    fabric: z.fabric,
    supplierName: z.supplierName,
    supplierGstin: z.supplierGstin,
    supplierPhone: z.supplierPhone,
    size: z.size,
    sizes: z.sizes,
    pcsPerSet: SET_PCS,
  };
}

// ---------- Supplier orders (stock in) ----------

function rowToOrder(d: TableRow): Order {
  return {
    id: d.id,
    orderNo: s(d.orderNo),
    createdAt: s(d.createdAt),
    createdBy: s(d.createdBy),
    supplierId: s(d.supplierId),
    supplierName: s(d.supplierName),
    supplierPhone: s(d.supplierPhone),
    supplierGstin: s(d.supplierGstin),
    supplierAddress: s(d.supplierAddress),
    totalSets: num(d.totalSets),
    totalPieces: num(d.totalPieces),
    totalAmount: num(d.totalAmount),
    notes: s(d.notes),
  };
}

function rowToOrderItem(d: TableRow): OrderItem {
  return { ...rowToLine(d), id: d.id, orderId: s(d.orderId), sizeId: s(d.sizeId), amount: num(d.amount), sellRate: num(d.sellRate) };
}

export async function listOrders(): Promise<Order[]> {
  const { rows } = await readTable(TABS.orders);
  return rows.map((r) => rowToOrder(r.data)).reverse();
}

export async function getOrder(id: string): Promise<{ order: Order; items: OrderItem[] } | null> {
  const row = await findRowById(TABS.orders, id);
  if (!row) return null;
  const { rows } = await readTable(TABS.orderItems);
  return { order: rowToOrder(row.data), items: rows.map((r) => rowToOrderItem(r.data)).filter((i) => i.orderId === id) };
}

export type OrderInput = {
  notes: string;
  lines: { sizeId: string; sets: number; rate: number; sellRate: number }[];
};

type Resolved =
  | { error: string }
  | { supplier: Supplier; items: Omit<OrderItem, "id" | "orderId">[]; sizes: Map<string, { row: number; size: ArticleSize }> };

/** Checks the lines against the saved articles: all must exist and come from one supplier. */
async function resolveOrder(input: OrderInput): Promise<Resolved> {
  const [{ rows: sizeRows }, tags, suppliers] = await Promise.all([readTable(TABS.sizes), listTags(), listSuppliers()]);
  const sizes = new Map(sizeRows.map((r) => [r.data.id, { row: r.rowNumber, size: rowToSize(r.data) }]));
  const items: Omit<OrderItem, "id" | "orderId">[] = [];
  let supplierName = "";
  for (const l of input.lines) {
    const found = sizes.get(l.sizeId);
    if (!found) return { error: "One of the articles is no longer saved. Scan the tag again." };
    if (supplierName && !same(supplierName, found.size.supplierName)) {
      return { error: `One order is for one supplier. ${found.size.articleCode} is from ${found.size.supplierName}.` };
    }
    supplierName = found.size.supplierName;
    const pieces = Math.max(1, Math.round(l.sets)) * SET_PCS;
    const rate = money(l.rate);
    items.push({ ...articleFields(found.size), sizeId: l.sizeId, sets: Math.max(1, Math.round(l.sets)), pieces, rate, amount: lineMoney({ pieces, rate }).gross, sellRate: money(l.sellRate) });
  }
  const tag = tags.find((t) => same(t.supplierName, supplierName));
  const supplier = suppliers.find((x) => x.id === tag?.supplierId) ?? suppliers.find((x) => same(x.name, supplierName));
  if (!supplier) return { error: "The supplier of these articles is missing. Scan the tag again." };
  return { supplier, items, sizes };
}

/** Rates entered on the order become the article's current supplier rate and selling price. */
async function rememberRates(items: Omit<OrderItem, "id" | "orderId">[], sizes: Map<string, { row: number; size: ArticleSize }>) {
  for (const i of items) {
    const found = sizes.get(i.sizeId);
    if (!found) continue;
    const next = { ...found.size, rate: i.rate, sellRate: i.sellRate > 0 ? i.sellRate : found.size.sellRate };
    if (next.rate !== found.size.rate || next.sellRate !== found.size.sellRate) await updateRow(TABS.sizes, found.row, toRow(next));
  }
}

function orderTotals(items: { sets: number; pieces: number; amount: number }[]) {
  return {
    totalSets: items.reduce((t, i) => t + i.sets, 0),
    totalPieces: items.reduce((t, i) => t + i.pieces, 0),
    totalAmount: money(items.reduce((t, i) => t + i.amount, 0)),
  };
}

function supplierFields(x: Supplier) {
  return { supplierId: x.id, supplierName: x.name, supplierPhone: x.phone, supplierGstin: x.gstin, supplierAddress: x.address };
}

export async function createOrder(input: OrderInput, user: string): Promise<{ orderId: string } | { error: string }> {
  const resolved = await resolveOrder(input);
  if ("error" in resolved) return resolved;
  const { supplier, items, sizes } = resolved;

  const orderNo = nextDocNumber("PO", (await listOrders()).map((o) => o.orderNo));
  const id = newId("ord");
  await appendRow(TABS.orders, toRow({ id, orderNo, createdAt: new Date().toISOString(), createdBy: user, notes: input.notes, ...supplierFields(supplier), ...orderTotals(items) }));
  await appendRows(TABS.orderItems, items.map((i) => toRow({ ...i, id: newId("ori"), orderId: id })));
  await rememberRates(items, sizes);
  return { orderId: id };
}

/** Replaces a supplier order's lines. Stock follows automatically because it is computed from the lines. */
export async function updateOrder(id: string, input: OrderInput): Promise<{ orderId: string } | { error: string }> {
  const row = await findRowById(TABS.orders, id);
  if (!row) return { error: "This order no longer exists." };
  const resolved = await resolveOrder(input);
  if ("error" in resolved) return resolved;
  const { supplier, items, sizes } = resolved;

  await updateRow(TABS.orders, row.rowNumber, toRow({ ...rowToOrder(row.data), notes: input.notes, ...supplierFields(supplier), ...orderTotals(items) }));
  const { rows } = await readTable(TABS.orderItems);
  for (const r of rows.filter((r) => r.data.orderId === id)) await clearRow(TABS.orderItems, r.rowNumber);
  await appendRows(TABS.orderItems, items.map((i) => toRow({ ...i, id: newId("ori"), orderId: id })));
  await rememberRates(items, sizes);
  return { orderId: id };
}

// ---------- Customer bills (stock out) ----------

function rowToBill(d: TableRow): Bill {
  return {
    id: d.id,
    billNo: s(d.billNo),
    createdAt: s(d.createdAt),
    createdBy: s(d.createdBy),
    customerId: s(d.customerId),
    customerName: s(d.customerName),
    customerPhone: s(d.customerPhone),
    customerGstin: s(d.customerGstin),
    customerAddress: s(d.customerAddress),
    totalSets: num(d.totalSets),
    totalPieces: num(d.totalPieces),
    grossAmount: num(d.grossAmount),
    discountAmount: num(d.discountAmount),
    taxableAmount: num(d.taxableAmount),
    cgstRate: num(d.cgstRate),
    cgstAmount: num(d.cgstAmount),
    sgstRate: num(d.sgstRate),
    sgstAmount: num(d.sgstAmount),
    roundOff: num(d.roundOff),
    total: num(d.total),
    notes: s(d.notes),
  };
}

function rowToBillItem(d: TableRow): BillItem {
  return {
    ...rowToLine(d),
    id: d.id,
    billId: s(d.billId),
    sizeId: s(d.sizeId),
    loosePieces: num(d.loosePieces),
    costRate: num(d.costRate),
    hsn: s(d.hsn),
    grossAmount: num(d.grossAmount),
    discountPct: num(d.discountPct),
    discountAmount: num(d.discountAmount),
    taxableAmount: num(d.taxableAmount),
  };
}

export async function listBills(): Promise<Bill[]> {
  const { rows } = await readTable(TABS.bills);
  return rows.map((r) => rowToBill(r.data)).reverse();
}

async function listBillItems(): Promise<BillItem[]> {
  const { rows } = await readTable(TABS.billItems);
  return rows.map((r) => rowToBillItem(r.data));
}

export async function getBill(id: string): Promise<{ bill: Bill; items: BillItem[] } | null> {
  const row = await findRowById(TABS.bills, id);
  if (!row) return null;
  return { bill: rowToBill(row.data), items: (await listBillItems()).filter((i) => i.billId === id) };
}

export type BillInput = {
  customerName: string;
  customerPhone: string;
  customerGstin: string;
  customerAddress: string;
  notes: string;
  hsn: string;
  lines: { sizeId: string; sets: number; loosePieces: number; rate: number; discountPct: number }[];
};

/** Makes a customer bill from stock. Selling more than is in stock is allowed; the screen warns first. */
export async function createBill(input: BillInput, user: string): Promise<{ billId: string } | { error: string }> {
  const sizes = new Map((await listSizes()).map((z) => [z.id, z]));
  const lines = [];
  for (const l of input.lines) {
    const z = sizes.get(l.sizeId);
    if (!z) return { error: "One of the articles is no longer saved." };
    const sets = Math.max(0, Math.round(l.sets));
    const loosePieces = Math.max(0, Math.round(l.loosePieces));
    const pieces = sets * SET_PCS + loosePieces;
    if (pieces <= 0) return { error: `Enter a quantity for ${z.articleCode} (${z.size}).` };
    lines.push({ z, sets, loosePieces, pieces, rate: money(l.rate), discountPct: Math.min(100, Math.max(0, num(l.discountPct))) });
  }
  if (lines.length === 0) return { error: "Add at least one item." };

  const customer = await upsertCustomer({ name: input.customerName, phone: input.customerPhone, gstin: input.customerGstin, address: input.customerAddress });
  const totals = billMoney(lines);
  const billNo = nextDocNumber("INV", (await listBills()).map((b) => b.billNo));
  const billId = newId("bil");

  await appendRow(
    TABS.bills,
    toRow({
      id: billId,
      billNo,
      createdAt: new Date().toISOString(),
      createdBy: user,
      customerId: customer.id,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerGstin: input.customerGstin,
      customerAddress: input.customerAddress,
      notes: input.notes,
      ...totals,
    } satisfies Bill)
  );

  await appendRows(
    TABS.billItems,
    lines.map((l) => {
      const m = lineMoney(l);
      return toRow({
        ...articleFields(l.z),
        id: newId("bli"),
        billId,
        sizeId: l.z.id,
        hsn: input.hsn,
        sets: l.sets,
        loosePieces: l.loosePieces,
        pieces: l.pieces,
        rate: l.rate,
        costRate: l.z.rate,
        grossAmount: m.gross,
        discountPct: l.discountPct,
        discountAmount: m.discountAmount,
        taxableAmount: m.taxable,
      } satisfies BillItem);
    })
  );
  return { billId };
}

// ---------- Daily supplier report ----------

export type SupplierLine = {
  articleCode: string;
  brand: string;
  fabric: string;
  size: string;
  sizes: string;
  rate: number;
  pieces: number;
  amount: number;
};

export type SupplierDay = {
  supplierName: string;
  supplierGstin: string;
  supplierPhone: string;
  lines: SupplierLine[];
  totalPieces: number;
  totalAmount: number;
  billNos: string[];
};

/** Everything billed on one day (Indian time), grouped by supplier, valued at the supplier's rate. */
export async function supplierDay(day: string): Promise<{ suppliers: SupplierDay[]; billCount: number }> {
  const bills = (await listBills()).filter((b) => istDay(b.createdAt) === day);
  const billNo = new Map(bills.map((b) => [b.id, b.billNo]));
  const items = (await listBillItems()).filter((i) => billNo.has(i.billId));

  const bySupplier = new Map<string, SupplierDay>();
  for (const i of items) {
    const key = norm(i.supplierName || "Unknown supplier");
    let sup = bySupplier.get(key);
    if (!sup) {
      sup = { supplierName: i.supplierName || "Unknown supplier", supplierGstin: i.supplierGstin, supplierPhone: i.supplierPhone, lines: [], totalPieces: 0, totalAmount: 0, billNos: [] };
      bySupplier.set(key, sup);
    }
    sup.supplierGstin ||= i.supplierGstin;
    sup.supplierPhone ||= i.supplierPhone;
    const no = billNo.get(i.billId) ?? "";
    if (no && !sup.billNos.includes(no)) sup.billNos.push(no);

    const amount = money(i.pieces * i.costRate);
    let line = sup.lines.find((l) => l.articleCode === i.articleCode && l.size === i.size && l.rate === i.costRate);
    if (!line) {
      line = { articleCode: i.articleCode, brand: i.brand, fabric: i.fabric, size: i.size, sizes: i.sizes, rate: i.costRate, pieces: 0, amount: 0 };
      sup.lines.push(line);
    }
    line.pieces += i.pieces;
    line.amount = money(line.amount + amount);
    sup.totalPieces += i.pieces;
    sup.totalAmount = money(sup.totalAmount + amount);
  }

  const suppliers = [...bySupplier.values()].sort((a, b) => a.supplierName.localeCompare(b.supplierName));
  for (const sup of suppliers) {
    sup.lines.sort((a, b) => a.articleCode.localeCompare(b.articleCode) || a.size.localeCompare(b.size));
    sup.billNos.sort();
  }
  return { suppliers, billCount: bills.length };
}
