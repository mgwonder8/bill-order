import { formatRs } from "@/lib/money";
import { formatDate, formatDateTime } from "@/lib/dates";
import type { Bill, BillItem, Order, OrderItem, ShopInfo } from "@/lib/types";
import type { SupplierDay } from "@/lib/store/data";

/** Short WhatsApp-friendly summaries that go along with (or instead of) the PDF. */

export function orderMessage(shop: ShopInfo, order: Order, items: OrderItem[]): string {
  const lines = items.map((i) => `• ${i.articleCode} (${i.size}) – ${i.sets} set${i.sets === 1 ? "" : "s"} = ${i.pieces} pcs @ ${formatRs(i.rate)}`);
  return [
    `*Order Form ${order.orderNo}*`,
    `${shop.name}`,
    `Date: ${formatDateTime(order.createdAt)}`,
    order.customerName ? `Customer: ${order.customerName}` : "",
    "",
    ...lines,
    "",
    `Total: ${order.totalSets} sets = ${order.totalPieces} pcs`,
    `Amount: ${formatRs(order.totalAmount)} (before GST)`,
  ]
    .filter((l, i, a) => l !== "" || a[i - 1] !== "")
    .join("\n");
}

export function billMessage(shop: ShopInfo, bill: Bill, items: BillItem[]): string {
  return [
    `*Bill ${bill.billNo}* from ${shop.name}`,
    `Date: ${formatDateTime(bill.createdAt)}`,
    `Customer: ${bill.customerName}`,
    "",
    `${items.length} item${items.length === 1 ? "" : "s"}, ${bill.totalSets} sets = ${bill.totalPieces} pcs`,
    ...(bill.discountAmount > 0 ? [`Discount: ${formatRs(bill.discountAmount)}`] : []),
    `CGST ${bill.cgstRate}%: ${formatRs(bill.cgstAmount)}`,
    `SGST ${bill.sgstRate}%: ${formatRs(bill.sgstAmount)}`,
    `*Total: ${formatRs(bill.total)}*`,
    "",
    "Thank you for your business.",
  ].join("\n");
}

export function supplierMessage(shop: ShopInfo, day: string, sup: SupplierDay): string {
  const lines = sup.lines.map((l) => `• ${l.articleCode} (${l.size}) – ${l.sets} set${l.sets === 1 ? "" : "s"} = ${l.pieces} pcs`);
  return [
    `*Daily order from ${shop.name}*`,
    `Date: ${formatDate(day)}`,
    ...(shop.gstin ? [`Our GSTIN: ${shop.gstin}`] : []),
    `To: ${sup.supplierName}${sup.supplierGstin ? ` (GSTIN ${sup.supplierGstin})` : ""}`,
    "",
    ...lines,
    "",
    `*Total: ${sup.totalSets} sets = ${sup.totalPieces} pcs*`,
    `Value at tag rate: ${formatRs(sup.totalAmount)}`,
  ].join("\n");
}
