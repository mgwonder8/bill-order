import { appendRow, appendRows, clearRow, findRowById, readTable, updateRow } from "@/lib/store/table";
import { TABS } from "@/lib/store/schema";
import type { TableRow } from "@/lib/store/table-types";
import { billMoney, lineMoney, money, num } from "@/lib/money";
import { newId, nextDocNumber } from "@/lib/ids";
import { istDay } from "@/lib/dates";
import type { ArticleSize, Bill, BillItem, LineBase, Order, OrderItem, Tag } from "@/lib/types";

function toRow(obj: object): TableRow {
  const row: TableRow = {};
  for (const [k, v] of Object.entries(obj)) row[k] = v === null || v === undefined ? "" : String(v);
  return row;
}

function s(v: string | undefined): string {
  return v ?? "";
}

// ---------- Tags (articles) and their size sets ----------

function rowToTag(d: TableRow): Tag {
  return {
    id: d.id,
    createdAt: s(d.createdAt),
    createdBy: s(d.createdBy),
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
    pcsPerSet: num(d.pcsPerSet) || 1,
    rate: num(d.rate),
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

const same = (a: string, b: string) => a.trim().toUpperCase() === b.trim().toUpperCase();

/**
 * Saves a confirmed tag as an article plus one row per size set. Scanning the same
 * article from the same supplier again reuses it: rates are updated to the latest
 * tag and new size sets are added, so the list never fills with duplicates.
 */
export async function saveTag(input: {
  tag: Omit<Tag, "id" | "createdAt">;
  sets: { size: string; sizes: string; pcsPerSet: number; rate: number }[];
}): Promise<{ tagId: string; sizes: ArticleSize[] }> {
  const createdAt = new Date().toISOString();
  const existing = (await listTags()).find(
    (t) => same(t.designNo, input.tag.designNo) && same(t.supplierName, input.tag.supplierName)
  );
  const tagId = existing?.id ?? newId("tag");
  if (!existing) await appendRow(TABS.tags, toRow({ ...input.tag, id: tagId, createdAt }));

  const { rows } = await readTable(TABS.sizes);
  const result: ArticleSize[] = [];
  const fresh: ArticleSize[] = [];
  for (const z of input.sets) {
    const row = rows.find((r) => r.data.tagId === tagId && r.data.size === z.size);
    if (row) {
      const updated = { ...rowToSize(row.data), rate: money(z.rate), pcsPerSet: z.pcsPerSet };
      if (updated.rate !== num(row.data.rate)) await updateRow(TABS.sizes, row.rowNumber, toRow(updated));
      result.push(updated);
      continue;
    }
    const created: ArticleSize = {
      id: newId("siz"),
      tagId,
      createdAt,
      articleCode: existing?.designNo ?? input.tag.designNo,
      supplierName: existing?.supplierName ?? input.tag.supplierName,
      supplierGstin: input.tag.supplierGstin || existing?.supplierGstin || "",
      supplierPhone: input.tag.supplierPhone || existing?.supplierPhone || "",
      brand: input.tag.brand,
      fabric: input.tag.fabric,
      size: z.size,
      sizes: z.sizes,
      pcsPerSet: z.pcsPerSet,
      rate: money(z.rate),
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
    pcsPerSet: num(d.pcsPerSet) || 1,
    sets: num(d.sets),
    pieces: num(d.pieces),
    rate: num(d.rate),
  };
}

// ---------- Order forms ----------

function rowToOrder(d: TableRow): Order {
  return {
    id: d.id,
    orderNo: s(d.orderNo),
    createdAt: s(d.createdAt),
    createdBy: s(d.createdBy),
    customerName: s(d.customerName),
    customerPhone: s(d.customerPhone),
    customerGstin: s(d.customerGstin),
    customerAddress: s(d.customerAddress),
    status: (d.status === "billed" ? "billed" : "open") as Order["status"],
    billId: s(d.billId),
    totalSets: num(d.totalSets),
    totalPieces: num(d.totalPieces),
    totalAmount: num(d.totalAmount),
    notes: s(d.notes),
  };
}

function rowToOrderItem(d: TableRow): OrderItem {
  return { ...rowToLine(d), id: d.id, orderId: s(d.orderId), sizeId: s(d.sizeId), amount: num(d.amount) };
}

export async function listOrders(): Promise<Order[]> {
  const { rows } = await readTable(TABS.orders);
  return rows.map((r) => rowToOrder(r.data)).reverse();
}

export async function getOrder(id: string): Promise<{ order: Order; items: OrderItem[] } | null> {
  const row = await findRowById(TABS.orders, id);
  if (!row) return null;
  const { rows } = await readTable(TABS.orderItems);
  return {
    order: rowToOrder(row.data),
    items: rows.map((r) => rowToOrderItem(r.data)).filter((i) => i.orderId === id),
  };
}

export type OrderInput = {
  customerName: string;
  customerPhone: string;
  customerGstin: string;
  customerAddress: string;
  notes: string;
  lines: (LineBase & { sizeId: string })[];
};

function orderLines(orderId: string, lines: OrderInput["lines"]): TableRow[] {
  return lines.map((l) => {
    const m = lineMoney(l);
    return toRow({ ...l, id: newId("ori"), orderId, pieces: m.pieces, rate: money(l.rate), amount: m.gross });
  });
}

function orderTotals(lines: OrderInput["lines"]) {
  const m = billMoney(lines);
  return { totalSets: m.totalSets, totalPieces: m.totalPieces, totalAmount: m.grossAmount };
}

export async function createOrder(input: OrderInput, user: string): Promise<string> {
  const orderNo = nextDocNumber("ORD", (await listOrders()).map((o) => o.orderNo));
  const id = newId("ord");
  const { lines, ...head } = input;
  await appendRow(
    TABS.orders,
    toRow({
      ...head,
      id,
      orderNo,
      createdAt: new Date().toISOString(),
      createdBy: user,
      status: "open",
      billId: "",
      ...orderTotals(lines),
    })
  );
  await appendRows(TABS.orderItems, orderLines(id, lines));
  return id;
}

/** Replaces an open order's details and lines. Billed orders are frozen. */
export async function updateOrder(id: string, input: OrderInput): Promise<"ok" | "missing" | "billed"> {
  const row = await findRowById(TABS.orders, id);
  if (!row) return "missing";
  const current = rowToOrder(row.data);
  if (current.status === "billed") return "billed";

  const { lines, ...head } = input;
  await updateRow(TABS.orders, row.rowNumber, toRow({ ...current, ...head, ...orderTotals(lines) }));

  const { rows } = await readTable(TABS.orderItems);
  for (const r of rows.filter((r) => r.data.orderId === id).sort((a, b) => b.rowNumber - a.rowNumber)) {
    await clearRow(TABS.orderItems, r.rowNumber);
  }
  await appendRows(TABS.orderItems, orderLines(id, lines));
  return "ok";
}

// ---------- Bills ----------

function rowToBill(d: TableRow): Bill {
  return {
    id: d.id,
    billNo: s(d.billNo),
    orderId: s(d.orderId),
    orderNo: s(d.orderNo),
    createdAt: s(d.createdAt),
    createdBy: s(d.createdBy),
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

/** Turns an open order into a GST bill, then marks the order billed. */
export async function billOrder(
  orderId: string,
  input: {
    customerName: string;
    customerPhone: string;
    customerGstin: string;
    customerAddress: string;
    notes: string;
    hsn: string;
    discounts: Record<string, number>;
  },
  user: string
): Promise<{ billId: string } | { error: string }> {
  const found = await getOrder(orderId);
  if (!found) return { error: "This order no longer exists." };
  if (found.order.status === "billed") return { error: "This order has already been billed." };
  if (found.items.length === 0) return { error: "This order has no items." };

  const lines = found.items.map((i) => ({ ...i, discountPct: Math.min(100, Math.max(0, num(input.discounts[i.id]))) }));
  const totals = billMoney(lines);
  const billNo = nextDocNumber("INV", (await listBills()).map((b) => b.billNo));
  const billId = newId("bil");

  await appendRow(
    TABS.bills,
    toRow({
      id: billId,
      billNo,
      orderId,
      orderNo: found.order.orderNo,
      createdAt: new Date().toISOString(),
      createdBy: user,
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
        id: newId("bli"),
        billId,
        hsn: input.hsn,
        articleCode: l.articleCode,
        brand: l.brand,
        fabric: l.fabric,
        supplierName: l.supplierName,
        supplierGstin: l.supplierGstin,
        supplierPhone: l.supplierPhone,
        size: l.size,
        sizes: l.sizes,
        pcsPerSet: l.pcsPerSet,
        sets: l.sets,
        pieces: m.pieces,
        rate: l.rate,
        grossAmount: m.gross,
        discountPct: l.discountPct,
        discountAmount: m.discountAmount,
        taxableAmount: m.taxable,
      } satisfies BillItem);
    })
  );

  const orderRow = await findRowById(TABS.orders, orderId);
  if (orderRow) {
    await updateRow(
      TABS.orders,
      orderRow.rowNumber,
      toRow({
        ...found.order,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        customerGstin: input.customerGstin,
        customerAddress: input.customerAddress,
        status: "billed",
        billId,
      })
    );
  }
  return { billId };
}

// ---------- Daily supplier compile ----------

export type SupplierLine = {
  articleCode: string;
  brand: string;
  fabric: string;
  size: string;
  sizes: string;
  pcsPerSet: number;
  rate: number;
  sets: number;
  pieces: number;
  amount: number;
};

export type SupplierDay = {
  supplierName: string;
  supplierGstin: string;
  supplierPhone: string;
  lines: SupplierLine[];
  totalSets: number;
  totalPieces: number;
  totalAmount: number;
  billNos: string[];
};

/** Everything billed on one day (Indian time), grouped by supplier, then by article and size set. */
export async function supplierDay(day: string): Promise<{ suppliers: SupplierDay[]; billCount: number }> {
  const bills = (await listBills()).filter((b) => istDay(b.createdAt) === day);
  const billNo = new Map(bills.map((b) => [b.id, b.billNo]));
  const items = (await listBillItems()).filter((i) => billNo.has(i.billId));

  const bySupplier = new Map<string, SupplierDay>();
  for (const i of items) {
    const key = (i.supplierName || "Unknown supplier").trim().toUpperCase();
    let sup = bySupplier.get(key);
    if (!sup) {
      sup = {
        supplierName: i.supplierName || "Unknown supplier",
        supplierGstin: i.supplierGstin,
        supplierPhone: i.supplierPhone,
        lines: [],
        totalSets: 0,
        totalPieces: 0,
        totalAmount: 0,
        billNos: [],
      };
      bySupplier.set(key, sup);
    }
    sup.supplierGstin ||= i.supplierGstin;
    sup.supplierPhone ||= i.supplierPhone;
    const no = billNo.get(i.billId) ?? "";
    if (no && !sup.billNos.includes(no)) sup.billNos.push(no);

    let line = sup.lines.find((l) => l.articleCode === i.articleCode && l.size === i.size && l.rate === i.rate);
    if (!line) {
      line = {
        articleCode: i.articleCode,
        brand: i.brand,
        fabric: i.fabric,
        size: i.size,
        sizes: i.sizes,
        pcsPerSet: i.pcsPerSet,
        rate: i.rate,
        sets: 0,
        pieces: 0,
        amount: 0,
      };
      sup.lines.push(line);
    }
    line.sets += i.sets;
    line.pieces += i.pieces;
    line.amount = money(line.amount + i.grossAmount);
    sup.totalSets += i.sets;
    sup.totalPieces += i.pieces;
    sup.totalAmount = money(sup.totalAmount + i.grossAmount);
  }

  const suppliers = [...bySupplier.values()].sort((a, b) => a.supplierName.localeCompare(b.supplierName));
  for (const sup of suppliers) {
    sup.lines.sort((a, b) => a.articleCode.localeCompare(b.articleCode) || a.size.localeCompare(b.size));
    sup.billNos.sort();
  }
  return { suppliers, billCount: bills.length };
}
