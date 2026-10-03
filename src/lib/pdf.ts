"use client";

import type { jsPDF as JsPDF } from "jspdf";
import type { CellHookData } from "jspdf-autotable";
import { formatRs } from "@/lib/money";
import { formatDate, formatDateTime, formatTime } from "@/lib/dates";
import { amountInWords } from "@/lib/words";
import type { Bill, BillItem, Order, OrderItem, ShopInfo } from "@/lib/types";
import type { SupplierDay } from "@/lib/store/data";

const M = 14;
const PAGE_W = 210;
const INK: [number, number, number] = [26, 24, 21];
const MUTED: [number, number, number] = [111, 106, 98];
const ACCENT: [number, number, number] = [180, 83, 31];

async function newDoc() {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  return { doc, autoTable };
}

function lastY(doc: JsPDF): number {
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
}

/** Shop block on the left, document title, number, date and time on the right. */
function header(doc: JsPDF, shop: ShopInfo, title: string, rows: [string, string][]): number {
  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold").setFontSize(15);
  doc.text(shop.name, M, 20);
  doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(...MUTED);
  const addr = doc.splitTextToSize(shop.address, 105) as string[];
  doc.text(addr, M, 25.5);
  let y = 25.5 + addr.length * 3.8;
  if (shop.gstin) {
    doc.text(`GSTIN: ${shop.gstin}`, M, y);
    y += 3.8;
  }
  const contact = [shop.phone, shop.email].filter(Boolean).join("  |  ");
  if (contact) {
    doc.text(contact, M, y);
    y += 3.8;
  }

  doc.setFont("helvetica", "bold").setFontSize(12).setTextColor(...ACCENT);
  doc.text(title, PAGE_W - M, 20, { align: "right" });
  doc.setFontSize(9).setTextColor(...INK);
  let ry = 26;
  doc.setFont("helvetica", "bold");
  const labelX = PAGE_W - M - Math.max(42, ...rows.map(([, v]) => doc.getTextWidth(v) + 18));
  for (const [k, v] of rows) {
    doc.setFont("helvetica", "normal").setTextColor(...MUTED);
    doc.text(`${k}:`, labelX, ry);
    doc.setFont("helvetica", "bold").setTextColor(...INK);
    doc.text(v, PAGE_W - M, ry, { align: "right" });
    ry += 4.6;
  }

  const bottom = Math.max(y, ry) + 2;
  doc.setDrawColor(228, 224, 216).setLineWidth(0.4);
  doc.line(M, bottom, PAGE_W - M, bottom);
  return bottom + 6;
}

function party(doc: JsPDF, label: string, lines: string[], y: number, x = M): number {
  doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(...MUTED);
  doc.text(label.toUpperCase(), x, y);
  doc.setFont("helvetica", "bold").setFontSize(10.5).setTextColor(...INK);
  doc.text(lines[0] || "-", x, y + 5);
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(...MUTED);
  let yy = y + 9.5;
  for (const l of lines.slice(1).filter(Boolean)) {
    const wrapped = doc.splitTextToSize(l, 85) as string[];
    doc.text(wrapped, x, yy);
    yy += wrapped.length * 4.2;
  }
  return yy;
}

function totalsBox(doc: JsPDF, rows: [string, string, boolean?][], y: number): number {
  const x1 = PAGE_W - M - 78;
  let yy = y;
  for (const [k, v, strong] of rows) {
    if (strong) {
      doc.setDrawColor(228, 224, 216).line(x1, yy - 3.6, PAGE_W - M, yy - 3.6);
      yy += 1.2;
      doc.setFont("helvetica", "bold").setFontSize(11.5).setTextColor(...INK);
    } else {
      doc.setFont("helvetica", "normal").setFontSize(9.5).setTextColor(...MUTED);
    }
    doc.text(k, x1, yy);
    doc.setTextColor(...INK);
    doc.text(v, PAGE_W - M, yy, { align: "right" });
    yy += strong ? 7 : 5.2;
  }
  return yy;
}

function footer(doc: JsPDF, note: string) {
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal").setFontSize(7.5).setTextColor(...MUTED);
    doc.text(note, M, 287);
    doc.text(`Page ${p} of ${pages}`, PAGE_W - M, 287, { align: "right" });
  }
}

const TABLE_STYLE = {
  theme: "grid" as const,
  // Right-aligns the totals row under every column the body right-aligns.
  didParseCell: (data: CellHookData) => {
    if (data.section === "foot" && data.table.styles.columnStyles[data.column.index]?.halign === "right") {
      data.cell.styles.halign = "right";
    }
  },
  styles: { font: "helvetica", fontSize: 8.6, cellPadding: 1.8, textColor: INK, lineColor: [228, 224, 216] as [number, number, number], lineWidth: 0.2 },
  headStyles: { fillColor: [246, 245, 242] as [number, number, number], textColor: INK, fontStyle: "bold" as const },
  margin: { left: M, right: M },
};

function slug(s: string) {
  return s.replace(/[^A-Za-z0-9-]+/g, "_").replace(/^_+|_+$/g, "");
}

// ---------- Order form ----------

export async function orderPdf(shop: ShopInfo, order: Order, items: OrderItem[]) {
  const { doc, autoTable } = await newDoc();
  let y = header(doc, shop, "ORDER FORM", [
    ["Order no", order.orderNo],
    ["Date", formatDate(order.createdAt)],
    ["Time", formatTime(order.createdAt)],
  ]);
  y = party(doc, "Customer", [order.customerName || "Walk-in customer", order.customerPhone, order.customerGstin ? `GSTIN: ${order.customerGstin}` : "", order.customerAddress], y);

  autoTable(doc, {
    ...TABLE_STYLE,
    startY: y + 3,
    head: [["#", "Article code", "Brand / Fabric", "Size set", "Sets", "Pieces", "Rate / pc", "Amount"]],
    body: items.map((i, n) => [
      n + 1,
      i.articleCode,
      [i.brand, i.fabric].filter(Boolean).join(" / "),
      `${i.size}${i.sizes ? `\n(${i.sizes})` : ""}`,
      i.sets,
      `${i.pieces}\n(${i.sets} x ${i.pcsPerSet})`,
      formatRs(i.rate),
      formatRs(i.amount),
    ]),
    foot: [["", "Total", "", "", order.totalSets, order.totalPieces, "", formatRs(order.totalAmount)]],
    footStyles: { fillColor: [246, 245, 242], textColor: INK, fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 8 }, 4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" }, 7: { halign: "right" } },
  });

  let ty = lastY(doc) + 8;
  doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(...MUTED);
  doc.text("1 set = one piece of each size in the set (22-28 or 30-36 = 4 pieces). GST is added on the bill.", M, ty);
  if (order.notes) {
    ty += 5;
    doc.text(doc.splitTextToSize(`Notes: ${order.notes}`, PAGE_W - 2 * M) as string[], M, ty);
  }
  footer(doc, `Order form ${order.orderNo} | ${formatDateTime(order.createdAt)} | ${shop.name}`);
  return { blob: doc.output("blob"), filename: `Order_${slug(order.orderNo)}${order.customerName ? `_${slug(order.customerName)}` : ""}.pdf` };
}

// ---------- Bill ----------

export async function billPdf(shop: ShopInfo, bill: Bill, items: BillItem[]) {
  const { doc, autoTable } = await newDoc();
  let y = header(doc, shop, "TAX INVOICE", [
    ["Bill no", bill.billNo],
    ["Date", formatDate(bill.createdAt)],
    ["Time", formatTime(bill.createdAt)],
    ...(bill.orderNo ? ([["Order no", bill.orderNo]] as [string, string][]) : []),
  ]);
  const left = party(doc, "Bill to", [bill.customerName, bill.customerPhone, bill.customerGstin ? `GSTIN: ${bill.customerGstin}` : "", bill.customerAddress], y);
  party(doc, "Place of supply", [shop.state], y, PAGE_W / 2 + 10);
  y = left;

  autoTable(doc, {
    ...TABLE_STYLE,
    startY: y + 3,
    styles: { ...TABLE_STYLE.styles, fontSize: 8 },
    head: [["#", "Article", "HSN", "Size set", "Sets", "Pcs", "Rate/pc", "Amount", "Disc %", "Discount", "Taxable"]],
    body: items.map((i, n) => [
      n + 1,
      `${i.articleCode}${i.brand ? `\n${i.brand}` : ""}`,
      i.hsn,
      `${i.size}${i.sizes ? `\n(${i.sizes})` : ""}`,
      i.sets,
      i.pieces,
      formatRs(i.rate).replace("Rs. ", ""),
      formatRs(i.grossAmount).replace("Rs. ", ""),
      i.discountPct ? `${i.discountPct}%` : "-",
      i.discountAmount ? formatRs(i.discountAmount).replace("Rs. ", "") : "-",
      formatRs(i.taxableAmount).replace("Rs. ", ""),
    ]),
    foot: [["", "Total", "", "", bill.totalSets, bill.totalPieces, "", formatRs(bill.grossAmount).replace("Rs. ", ""), "", formatRs(bill.discountAmount).replace("Rs. ", ""), formatRs(bill.taxableAmount).replace("Rs. ", "")]],
    footStyles: { fillColor: [246, 245, 242], textColor: INK, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 7 },
      4: { halign: "right" },
      5: { halign: "right" },
      6: { halign: "right" },
      7: { halign: "right" },
      8: { halign: "right" },
      9: { halign: "right" },
      10: { halign: "right" },
    },
  });

  let ty = lastY(doc) + 8;
  if (ty > 220) {
    doc.addPage();
    ty = 20;
  }
  const words = doc.splitTextToSize(amountInWords(bill.total), 90) as string[];
  doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(...MUTED);
  doc.text("AMOUNT IN WORDS", M, ty);
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(...INK);
  doc.text(words, M, ty + 5);
  let ly = ty + 5 + words.length * 4.2 + 3;
  doc.setFontSize(8.5).setTextColor(...MUTED);
  doc.text(`Total: ${bill.totalSets} sets = ${bill.totalPieces} pieces`, M, ly);
  ly += 4.5;
  if (bill.notes) {
    const n = doc.splitTextToSize(`Notes: ${bill.notes}`, 90) as string[];
    doc.text(n, M, ly);
    ly += n.length * 4.2;
  }
  if (shop.bank) {
    const b = doc.splitTextToSize(`Bank: ${shop.bank}`, 90) as string[];
    doc.text(b, M, ly + 1);
  }

  const end = totalsBox(
    doc,
    [
      ["Amount", formatRs(bill.grossAmount)],
      ...(bill.discountAmount > 0 ? ([["Less discount", `- ${formatRs(bill.discountAmount)}`]] as [string, string][]) : []),
      ["Taxable value", formatRs(bill.taxableAmount)],
      [`CGST @ ${bill.cgstRate}%`, formatRs(bill.cgstAmount)],
      [`SGST @ ${bill.sgstRate}%`, formatRs(bill.sgstAmount)],
      ...(bill.roundOff !== 0 ? ([["Round off", formatRs(bill.roundOff)]] as [string, string][]) : []),
      ["Grand total", formatRs(bill.total), true],
    ],
    ty
  );

  const sy = Math.max(end, ly) + 18;
  doc.setDrawColor(228, 224, 216).line(PAGE_W - M - 60, sy, PAGE_W - M, sy);
  doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(...MUTED);
  doc.text(`For ${shop.name}`, PAGE_W - M, sy + 4.5, { align: "right" });
  doc.text("Authorised signatory", PAGE_W - M, sy + 8.5, { align: "right" });

  footer(doc, `Bill ${bill.billNo} | ${formatDateTime(bill.createdAt)} | ${shop.name}`);
  return { blob: doc.output("blob"), filename: `Bill_${slug(bill.billNo)}_${slug(bill.customerName)}.pdf` };
}

// ---------- Daily supplier sheet ----------

export async function supplierPdf(shop: ShopInfo, day: string, suppliers: SupplierDay[], compiledAt: string) {
  const { doc, autoTable } = await newDoc();
  suppliers.forEach((sup, idx) => {
    if (idx > 0) doc.addPage();
    let y = header(doc, shop, "DAILY SUPPLIER ORDER", [
      ["For date", formatDate(day)],
      ["Compiled", formatDateTime(compiledAt)],
    ]);
    const left = party(doc, "To supplier", [sup.supplierName, sup.supplierGstin ? `GSTIN: ${sup.supplierGstin}` : "GSTIN: not added", sup.supplierPhone ? `Phone: ${sup.supplierPhone}` : ""], y);
    party(doc, "From", [shop.name, shop.gstin ? `GSTIN: ${shop.gstin}` : "", shop.phone], y, PAGE_W / 2 + 10);
    y = Math.max(left, y + 18);

    autoTable(doc, {
      ...TABLE_STYLE,
      startY: y + 3,
      head: [["#", "Article code", "Brand / Fabric", "Size set", "Sets", "Pieces", "Rate / pc", "Amount"]],
      body: sup.lines.map((l, n) => [
        n + 1,
        l.articleCode,
        [l.brand, l.fabric].filter(Boolean).join(" / "),
        `${l.size}${l.sizes ? `\n(${l.sizes})` : ""}`,
        l.sets,
        l.pieces,
        formatRs(l.rate),
        formatRs(l.amount),
      ]),
      foot: [["", "Total", "", "", sup.totalSets, sup.totalPieces, "", formatRs(sup.totalAmount)]],
      footStyles: { fillColor: [246, 245, 242], textColor: INK, fontStyle: "bold" },
      columnStyles: { 0: { cellWidth: 8 }, 4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" }, 7: { halign: "right" } },
    });

    const ty = lastY(doc) + 8;
    doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(...MUTED);
    doc.text(`Bills included: ${sup.billNos.join(", ")}`, M, ty, { maxWidth: PAGE_W - 2 * M });
    doc.text("Amounts are at the rate on your tag, before GST.", M, ty + 5);
  });
  footer(doc, `Daily supplier order | ${formatDate(day)} | ${shop.name}`);
  const name = suppliers.length === 1 ? `_${slug(suppliers[0].supplierName)}` : "_All_suppliers";
  return { blob: doc.output("blob"), filename: `Supplier_order_${day}${name}.pdf` };
}
