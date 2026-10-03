import { formatRs } from "@/lib/money";
import { formatDate, formatDateTime } from "@/lib/dates";
import { qtyLabel } from "@/lib/sets";
import type { Bill, BillItem, Order, OrderItem, ShopInfo } from "@/lib/types";
import type { SupplierDay } from "@/lib/store/data";

/** Short WhatsApp-friendly summaries that go along with (or instead of) the PDF. */

export function orderMessage(shop: ShopInfo, order: Order, items: OrderItem[]): string {
  const lines = items.map((i) => `• ${i.articleCode} (${i.size}) – ${i.sets} set${i.sets === 1 ? "" : "s"} = ${i.pieces} pcs @ ${formatRs(i.rate)}/pc`);
  return [
    `*Purchase Order ${order.orderNo}*`,
    `From: ${shop.name}${shop.gstin ? ` (GSTIN ${shop.gstin})` : ""}`,
    `To: ${order.supplierName}`,
    `Date: ${formatDateTime(order.createdAt)}`,
    "",
    ...lines,
    "",
    `*Total: ${order.totalSets} sets = ${order.totalPieces} pcs*`,
    `Amount at your rates: ${formatRs(order.totalAmount)}`,
    "1 set = 24 pieces.",
    ...(order.notes ? [`Note: ${order.notes}`] : []),
  ].join("\n");
}

export function billMessage(shop: ShopInfo, bill: Bill, items: BillItem[]): string {
  return [
    `*Bill ${bill.billNo}* from ${shop.name}`,
    `Date: ${formatDateTime(bill.createdAt)}`,
    `Customer: ${bill.customerName}`,
    "",
    `${items.length} item${items.length === 1 ? "" : "s"}, ${qtyLabel(bill.totalPieces)} (${bill.totalPieces} pcs)`,
    ...(bill.discountAmount > 0 ? [`Discount: ${formatRs(bill.discountAmount)}`] : []),
    `CGST ${bill.cgstRate}%: ${formatRs(bill.cgstAmount)}`,
    `SGST ${bill.sgstRate}%: ${formatRs(bill.sgstAmount)}`,
    `*Total: ${formatRs(bill.total)}*`,
    "",
    "Thank you for your business.",
  ].join("\n");
}

export function supplierMessage(shop: ShopInfo, day: string, sup: SupplierDay): string {
  const lines = sup.lines.map((l) => `• ${l.articleCode} (${l.size}) – ${qtyLabel(l.pieces)} (${l.pieces} pcs)`);
  return [
    `*Sold today at ${shop.name}*`,
    `Date: ${formatDate(day)}`,
    ...(shop.gstin ? [`Our GSTIN: ${shop.gstin}`] : []),
    `To: ${sup.supplierName}${sup.supplierGstin ? ` (GSTIN ${sup.supplierGstin})` : ""}`,
    "",
    ...lines,
    "",
    `*Total: ${qtyLabel(sup.totalPieces)} (${sup.totalPieces} pcs)*`,
    `Value at your rates: ${formatRs(sup.totalAmount)}`,
  ].join("\n");
}
