import { formatRs } from "@/lib/money";
import { formatDate, formatDateTime } from "@/lib/dates";
import type { Bill, BillItem, CustomerOrder, CustomerOrderItem, Order, OrderItem, ShopInfo } from "@/lib/types";
import type { CompileSupplier } from "@/lib/store/data";

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
    ...(order.notes ? [`Note: ${order.notes}`] : []),
  ].join("\n");
}

export function customerOrderMessage(shop: ShopInfo, order: CustomerOrder, items: CustomerOrderItem[]): string {
  const lines = items.map((i) => `• ${i.articleCode} (${i.size}) – ${i.sets} set${i.sets === 1 ? "" : "s"}, ${i.pieces} pcs @ ${formatRs(i.rate)}`);
  return [
    `*Order form ${order.orderNo}* from ${shop.name}`,
    `Date: ${formatDateTime(order.createdAt)}`,
    `Customer: ${order.customerName}`,
    "",
    ...lines,
    "",
    `*Total: ${order.totalSets} sets = ${order.totalPieces} pcs, ${formatRs(order.totalAmount)}*`,
    ...(order.notes ? [`Note: ${order.notes}`] : []),
  ].join("\n");
}

export function billMessage(shop: ShopInfo, bill: Bill, items: BillItem[]): string {
  const withGst = bill.gstMode === "with";
  return [
    `*Bill ${bill.billNo}* from ${shop.name}`,
    `Date: ${formatDateTime(bill.createdAt)}`,
    `Customer: ${bill.customerName}`,
    "",
    `${items.length} item${items.length === 1 ? "" : "s"}, ${bill.totalSets} sets = ${bill.totalPieces} pcs`,
    ...(bill.discountAmount > 0 ? [`Discount: ${formatRs(bill.discountAmount)}`] : []),
    ...(withGst ? [`CGST ${bill.cgstRate}%: ${formatRs(bill.cgstAmount)}`, `SGST ${bill.sgstRate}%: ${formatRs(bill.sgstAmount)}`] : ["Without GST"]),
    `*Total: ${formatRs(bill.total)}*`,
    "",
    `Subject to ${shop.jurisdiction} jurisdiction. Thank you for your business.`,
  ].join("\n");
}

export function compileMessage(shop: ShopInfo, day: string, sup: CompileSupplier): string {
  const lines = sup.brands.flatMap((b) => [`_${b.brand}_`, ...b.lines.map((l) => `• ${l.articleCode} (${l.size}) – ${l.sets} set${l.sets === 1 ? "" : "s"} = ${l.pieces} pcs`)]);
  return [
    `*Order from ${shop.name}*`,
    `Date: ${formatDate(day)}`,
    ...(shop.gstin ? [`Our GSTIN: ${shop.gstin}`] : []),
    `To: ${sup.supplierName}${sup.supplierGstin ? ` (GSTIN ${sup.supplierGstin})` : ""}`,
    "",
    ...lines,
    "",
    `*Total: ${sup.totalSets} sets = ${sup.totalPieces} pcs*`,
  ].join("\n");
}
