import { appendRow, appendRows, clearRow, findRowById, readTable, updateRow } from "@/lib/store/table";
import { TABS } from "@/lib/store/schema";
import type { TableRow } from "@/lib/store/table-types";
import { billMoney, lineMoney, money, num } from "@/lib/money";
import { newId, nextDocNumber } from "@/lib/ids";
import { istDay } from "@/lib/dates";
import { SET_PCS } from "@/lib/sets";
import type { ArticleSize, Bill, BillItem, Customer, CustomerOrder, CustomerOrderItem, GstMode, LineBase, Order, OrderItem, Supplier, Tag } from "@/lib/types";

function toRow(obj: object): TableRow {
  const row: TableRow = {};
  for (const [k, v] of Object.entries(obj)) row[k] = v === null || v === undefined ? "" : String(v);
  return row;
}

function s(v: string | undefined): string {
  return v ?? "";
}

/** Name given to articles saved from a bill before their supplier is known. */
export const UNKNOWN_SUPPLIER = "Unknown supplier";
const WALK_IN = "Walk-in customer";
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

export async function getTag(id: string): Promise<{ tag: Tag; sizes: ArticleSize[] } | null> {
  const row = await findRowById(TABS.tags, id);
  if (!row) return null;
  const sizes = (await listSizes()).filter((z) => z.tagId === id);
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

  const tagRows = (await readTable(TABS.tags)).rows;
  let existingRow = tagRows.find((r) => same(r.data.designNo ?? "", input.tag.designNo) && same(r.data.supplierName ?? "", input.tag.supplierName));
  // An article billed before its supplier was known is adopted by the supplier's real tag instead of duplicated.
  if (!existingRow && !same(supplier.name, UNKNOWN_SUPPLIER)) {
    const orphan = tagRows.find((r) => same(r.data.designNo ?? "", input.tag.designNo) && same(r.data.supplierName ?? "", UNKNOWN_SUPPLIER));
    if (orphan) {
      const cur = rowToTag(orphan.data);
      const adopted: Tag = {
        ...cur,
        supplierId: supplier.id,
        supplierName: supplier.name,
        supplierAddress: supplier.address,
        supplierPhone: supplier.phone,
        supplierEmail: supplier.email,
        supplierGstin: supplier.gstin,
        brand: cur.brand || input.tag.brand,
        fabric: cur.fabric || input.tag.fabric,
        imageUrl: cur.imageUrl || input.tag.imageUrl,
        driveFileId: cur.driveFileId || input.tag.driveFileId,
      };
      await updateRow(TABS.tags, orphan.rowNumber, toRow(adopted));
      existingRow = { rowNumber: orphan.rowNumber, data: toRow(adopted) };
      // Drop the placeholder supplier once no article uses it.
      if (!tagRows.some((r) => r.data.id !== orphan.data.id && same(r.data.supplierName ?? "", UNKNOWN_SUPPLIER))) {
        const placeholder = (await readTable(TABS.suppliers)).rows.find((r) => same(r.data.name ?? "", UNKNOWN_SUPPLIER));
        if (placeholder) await clearRow(TABS.suppliers, placeholder.rowNumber);
      }
    }
  }
  const existing = existingRow ? rowToTag(existingRow.data) : undefined;
  const tagId = existing?.id ?? newId("tag");
  if (!existing) await appendRow(TABS.tags, toRow({ ...input.tag, supplierName: supplier.name, id: tagId, createdAt, supplierId: supplier.id }));

  const { rows } = await readTable(TABS.sizes);
  const result: ArticleSize[] = [];
  const fresh: ArticleSize[] = [];
  for (const z of input.sets) {
    const row = rows.find((r) => r.data.tagId === tagId && r.data.size === z.size);
    if (row) {
      const current = rowToSize(row.data);
      const updated = { ...current, rate: money(z.rate), supplierName: supplier.name, supplierGstin: supplier.gstin, supplierPhone: supplier.phone };
      if (updated.rate !== current.rate || updated.supplierName !== current.supplierName || updated.supplierGstin !== current.supplierGstin || updated.supplierPhone !== current.supplierPhone) {
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

// ---------- Supplier orders (purchase orders) ----------

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

/** Replaces a supplier order's lines. */
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

// ---------- Customer order forms ----------

function rowToCustomerOrder(d: TableRow): CustomerOrder {
  return {
    id: d.id,
    orderNo: s(d.orderNo),
    createdAt: s(d.createdAt),
    createdBy: s(d.createdBy),
    customerId: s(d.customerId),
    customerName: s(d.customerName),
    customerPhone: s(d.customerPhone),
    customerGstin: s(d.customerGstin),
    customerAddress: s(d.customerAddress),
    status: d.status === "billed" ? "billed" : "open",
    billId: s(d.billId),
    totalSets: num(d.totalSets),
    totalPieces: num(d.totalPieces),
    totalAmount: num(d.totalAmount),
    notes: s(d.notes),
  };
}

function rowToCustomerOrderItem(d: TableRow): CustomerOrderItem {
  return { ...rowToLine(d), id: d.id, orderId: s(d.orderId), sizeId: s(d.sizeId), amount: num(d.amount) };
}

export async function listCustomerOrders(): Promise<CustomerOrder[]> {
  const { rows } = await readTable(TABS.customerOrders);
  return rows.map((r) => rowToCustomerOrder(r.data)).reverse();
}

async function listCustomerOrderItems(): Promise<CustomerOrderItem[]> {
  const { rows } = await readTable(TABS.customerOrderItems);
  return rows.map((r) => rowToCustomerOrderItem(r.data));
}

export async function getCustomerOrder(id: string): Promise<{ order: CustomerOrder; items: CustomerOrderItem[] } | null> {
  const row = await findRowById(TABS.customerOrders, id);
  if (!row) return null;
  return { order: rowToCustomerOrder(row.data), items: (await listCustomerOrderItems()).filter((i) => i.orderId === id) };
}

export type CustomerOrderInput = {
  customerName: string;
  customerPhone: string;
  customerGstin: string;
  customerAddress: string;
  notes: string;
  lines: { sizeId: string; sets: number; pieces: number; rate: number }[];
};

type ResolvedLines = { error: string } | { items: Omit<CustomerOrderItem, "id" | "orderId">[] };

/** Checks each line against the saved articles and prices it. The price entered becomes the article's selling price. */
async function resolveCustomerLines(lines: CustomerOrderInput["lines"]): Promise<ResolvedLines> {
  const { rows } = await readTable(TABS.sizes);
  const sizes = new Map(rows.map((r) => [r.data.id, { row: r.rowNumber, size: rowToSize(r.data) }]));
  const items: Omit<CustomerOrderItem, "id" | "orderId">[] = [];
  for (const l of lines) {
    const found = sizes.get(l.sizeId);
    if (!found) return { error: "One of the articles is no longer saved. Scan its tag again." };
    const pieces = Math.max(0, Math.round(l.pieces));
    if (pieces <= 0) return { error: `Enter the quantity for ${found.size.articleCode} (${found.size.size}).` };
    const rate = money(l.rate);
    items.push({ ...articleFields(found.size), sizeId: l.sizeId, sets: Math.max(0, Math.round(l.sets)), pieces, rate, amount: lineMoney({ pieces, rate }).gross });
    if (rate > 0 && rate !== found.size.sellRate) {
      found.size = { ...found.size, sellRate: rate };
      await updateRow(TABS.sizes, found.row, toRow(found.size));
    }
  }
  if (items.length === 0) return { error: "Add at least one article." };
  return { items };
}

/** A sale with no name and no phone is a walk-in: kept on the order, not saved as a customer. */
async function customerFor(input: { customerName: string; customerPhone: string; customerGstin: string; customerAddress: string }) {
  const customerName = input.customerName.trim() || WALK_IN;
  const customer =
    input.customerPhone.trim() || customerName !== WALK_IN
      ? await upsertCustomer({ name: customerName, phone: input.customerPhone, gstin: input.customerGstin, address: input.customerAddress })
      : null;
  return { customerId: customer?.id ?? "", customerName, customerPhone: input.customerPhone, customerGstin: input.customerGstin, customerAddress: input.customerAddress };
}

export async function createCustomerOrder(input: CustomerOrderInput, user: string): Promise<{ orderId: string } | { error: string }> {
  const resolved = await resolveCustomerLines(input.lines);
  if ("error" in resolved) return resolved;
  const orderNo = nextDocNumber("CO", (await listCustomerOrders()).map((o) => o.orderNo));
  const id = newId("cor");
  await appendRow(
    TABS.customerOrders,
    toRow({ id, orderNo, createdAt: new Date().toISOString(), createdBy: user, status: "open", billId: "", notes: input.notes, ...(await customerFor(input)), ...orderTotals(resolved.items) })
  );
  await appendRows(TABS.customerOrderItems, resolved.items.map((i) => toRow({ ...i, id: newId("coi"), orderId: id })));
  return { orderId: id };
}

/** Replaces an open order's customer and lines. Billed orders are locked so the bill always matches. */
export async function updateCustomerOrder(id: string, input: CustomerOrderInput): Promise<{ orderId: string } | { error: string }> {
  const row = await findRowById(TABS.customerOrders, id);
  if (!row) return { error: "This order no longer exists." };
  const current = rowToCustomerOrder(row.data);
  if (current.status === "billed") return { error: "This order is already billed, so it cannot be changed." };
  const resolved = await resolveCustomerLines(input.lines);
  if ("error" in resolved) return resolved;

  await updateRow(TABS.customerOrders, row.rowNumber, toRow({ ...current, notes: input.notes, ...(await customerFor(input)), ...orderTotals(resolved.items) }));
  const { rows } = await readTable(TABS.customerOrderItems);
  for (const r of rows.filter((r) => r.data.orderId === id)) await clearRow(TABS.customerOrderItems, r.rowNumber);
  await appendRows(TABS.customerOrderItems, resolved.items.map((i) => toRow({ ...i, id: newId("coi"), orderId: id })));
  return { orderId: id };
}

// ---------- Customer bills ----------

function rowToBill(d: TableRow): Bill {
  return {
    id: d.id,
    billNo: s(d.billNo),
    orderId: s(d.orderId),
    orderNo: s(d.orderNo),
    gstMode: d.gstMode === "without" ? "without" : "with",
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
  orderId: string;
  gstMode: GstMode;
  hsn: string;
  notes: string;
  discounts: Record<string, number>;
};

/** Turns a customer order form into a bill (with or without GST) and marks the order billed. */
export async function billCustomerOrder(input: BillInput, user: string): Promise<{ billId: string } | { error: string }> {
  const found = await getCustomerOrder(input.orderId);
  if (!found) return { error: "This order no longer exists." };
  if (found.order.status === "billed") return { error: "This order has already been billed." };
  if (found.items.length === 0) return { error: "This order has no items." };

  const sizes = new Map((await listSizes()).map((z) => [z.id, z]));
  const lines = found.items.map((i) => ({ ...i, discountPct: Math.min(100, Math.max(0, num(input.discounts[i.id]))) }));
  const totals = billMoney(lines, input.gstMode);
  const billNo = nextDocNumber("INV", (await listBills()).map((b) => b.billNo));
  const billId = newId("bil");
  // Customer details filled or changed on the bill screen are saved to the bill, the order and the customer list.
  const o = { ...found.order, ...(await customerFor(input)) };

  await appendRow(
    TABS.bills,
    toRow({
      id: billId,
      billNo,
      orderId: o.id,
      orderNo: o.orderNo,
      gstMode: input.gstMode,
      createdAt: new Date().toISOString(),
      createdBy: user,
      customerId: o.customerId,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      customerGstin: o.customerGstin,
      customerAddress: o.customerAddress,
      notes: input.notes,
      ...totals,
    } satisfies Bill)
  );

  await appendRows(
    TABS.billItems,
    lines.map((l) => {
      const m = lineMoney(l);
      return toRow({
        articleCode: l.articleCode,
        brand: l.brand,
        fabric: l.fabric,
        supplierName: l.supplierName,
        supplierGstin: l.supplierGstin,
        supplierPhone: l.supplierPhone,
        size: l.size,
        sizes: l.sizes,
        pcsPerSet: l.pcsPerSet,
        id: newId("bli"),
        billId,
        sizeId: l.sizeId,
        hsn: input.hsn,
        sets: l.sets,
        pieces: l.pieces,
        rate: l.rate,
        costRate: sizes.get(l.sizeId)?.rate ?? 0,
        grossAmount: m.gross,
        discountPct: l.discountPct,
        discountAmount: m.discountAmount,
        taxableAmount: m.taxable,
      } satisfies BillItem);
    })
  );

  const orderRow = await findRowById(TABS.customerOrders, o.id);
  if (orderRow) await updateRow(TABS.customerOrders, orderRow.rowNumber, toRow({ ...o, status: "billed", billId }));
  return { billId };
}

// ---------- Daily compile: what customers ordered, to order from each supplier ----------

export type CompileSource = { kind: "order" | "bill"; id: string; no: string; customerName: string; sets: number; pieces: number };

export type CompileLine = {
  sizeId: string;
  articleCode: string;
  brand: string;
  fabric: string;
  size: string;
  sizes: string;
  rate: number;
  sets: number;
  pieces: number;
  amount: number;
  sources: CompileSource[];
};

export type CompileBrand = { brand: string; lines: CompileLine[]; totalSets: number; totalPieces: number };

export type CompileSupplier = {
  supplierName: string;
  supplierGstin: string;
  supplierPhone: string;
  brands: CompileBrand[];
  totalSets: number;
  totalPieces: number;
  totalAmount: number;
  orderNos: string[];
};

export type CompileOrder = {
  kind: "order" | "bill";
  id: string;
  no: string;
  customerName: string;
  createdAt: string;
  billed: boolean;
  totalSets: number;
  totalPieces: number;
  lines: { articleCode: string; brand: string; size: string; supplierName: string; sets: number; pieces: number }[];
};

type DayLine = LineBase & { sizeId: string };

/**
 * Everything customers ordered on one day (Indian time), grouped supplier, then brand, then article
 * and size chart, valued at the supplier's rate. Bills with no order form behind them count too.
 */
export async function compileDay(day: string): Promise<{ suppliers: CompileSupplier[]; orders: CompileOrder[] }> {
  const [orders, orderItems, bills, billItems, sizeList] = await Promise.all([listCustomerOrders(), listCustomerOrderItems(), listBills(), listBillItems(), listSizes()]);
  const sizes = new Map(sizeList.map((z) => [z.id, z]));

  const sources: { src: Omit<CompileOrder, "lines" | "totalSets" | "totalPieces">; items: DayLine[] }[] = [];
  for (const o of orders.filter((o) => istDay(o.createdAt) === day)) {
    sources.push({
      src: { kind: "order", id: o.id, no: o.orderNo, customerName: o.customerName, createdAt: o.createdAt, billed: o.status === "billed" },
      items: orderItems.filter((i) => i.orderId === o.id),
    });
  }
  for (const b of bills.filter((b) => !b.orderId && istDay(b.createdAt) === day)) {
    sources.push({
      src: { kind: "bill", id: b.id, no: b.billNo, customerName: b.customerName, createdAt: b.createdAt, billed: true },
      items: billItems.filter((i) => i.billId === b.id),
    });
  }

  const bySupplier = new Map<string, CompileSupplier>();
  const compiled: CompileOrder[] = [];
  for (const { src, items } of sources) {
    const order: CompileOrder = { ...src, totalSets: 0, totalPieces: 0, lines: [] };
    for (const i of items) {
      const supplierName = i.supplierName || UNKNOWN_SUPPLIER;
      order.lines.push({ articleCode: i.articleCode, brand: i.brand, size: i.size, supplierName, sets: i.sets, pieces: i.pieces });
      order.totalSets += i.sets;
      order.totalPieces += i.pieces;

      let sup = bySupplier.get(norm(supplierName));
      if (!sup) {
        sup = { supplierName, supplierGstin: i.supplierGstin, supplierPhone: i.supplierPhone, brands: [], totalSets: 0, totalPieces: 0, totalAmount: 0, orderNos: [] };
        bySupplier.set(norm(supplierName), sup);
      }
      sup.supplierGstin ||= i.supplierGstin;
      sup.supplierPhone ||= i.supplierPhone;
      if (!sup.orderNos.includes(src.no)) sup.orderNos.push(src.no);

      const brandName = i.brand || "No brand";
      let brand = sup.brands.find((b) => same(b.brand, brandName));
      if (!brand) {
        brand = { brand: brandName, lines: [], totalSets: 0, totalPieces: 0 };
        sup.brands.push(brand);
      }
      let line = brand.lines.find((l) => same(l.articleCode, i.articleCode) && l.size === i.size);
      if (!line) {
        line = { sizeId: i.sizeId, articleCode: i.articleCode, brand: brandName, fabric: i.fabric, size: i.size, sizes: i.sizes, rate: sizes.get(i.sizeId)?.rate ?? 0, sets: 0, pieces: 0, amount: 0, sources: [] };
        brand.lines.push(line);
      }
      line.sets += i.sets;
      line.pieces += i.pieces;
      line.amount = money(line.pieces * line.rate);
      line.sources.push({ kind: src.kind, id: src.id, no: src.no, customerName: src.customerName, sets: i.sets, pieces: i.pieces });
      brand.totalSets += i.sets;
      brand.totalPieces += i.pieces;
      sup.totalSets += i.sets;
      sup.totalPieces += i.pieces;
    }
    compiled.push(order);
  }

  const suppliers = [...bySupplier.values()].sort((a, b) => a.supplierName.localeCompare(b.supplierName));
  for (const sup of suppliers) {
    sup.brands.sort((a, b) => a.brand.localeCompare(b.brand));
    for (const b of sup.brands) b.lines.sort((x, y) => x.articleCode.localeCompare(y.articleCode) || x.size.localeCompare(y.size));
    sup.totalAmount = money(sup.brands.reduce((t, b) => t + b.lines.reduce((u, l) => u + l.amount, 0), 0));
    sup.orderNos.sort();
  }
  compiled.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return { suppliers, orders: compiled };
}
