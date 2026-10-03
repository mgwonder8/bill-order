"use client";

import type { jsPDF as JsPDF } from "jspdf";
import type { CellHookData, UserOptions } from "jspdf-autotable";
import { formatRs } from "@/lib/money";
import { formatDate, formatDateTime, formatTime } from "@/lib/dates";
import { amountInWords } from "@/lib/words";
import type { Bill, BillItem, Order, OrderItem, ShopInfo } from "@/lib/types";
import type { SupplierDay } from "@/lib/store/data";

/*
 * A4 layout in millimetres. Every block measures its wrapped text before drawing,
 * table columns have fixed widths that add up to the content width, and the
 * summary block moves to a new page as a whole when it would not fit above the footer.
 */
const PAGE_W = 210;
const PAGE_H = 297;
const M = 14;
const CW = PAGE_W - 2 * M; // 182
const FOOTER_Y = 288;
const SAFE_BOTTOM = 278;

type RGB = [number, number, number];
const INK: RGB = [20, 22, 32];
const MUTED: RGB = [100, 107, 125];
const LINE: RGB = [229, 231, 238];
const ACCENT: RGB = [79, 70, 229];
const TINT: RGB = [238, 240, 255];
const PANEL: RGB = [246, 247, 250];

const amt = (n: number) => formatRs(n).replace("Rs. ", "");

async function newDoc() {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setLineHeightFactor(1.25);
  return { doc, autoTable };
}

function lastY(doc: JsPDF): number {
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
}

function wrap(doc: JsPDF, text: string, width: number): string[] {
  return text ? (doc.splitTextToSize(text, width) as string[]) : [];
}

/** Line height in mm for the current font size. */
function lh(doc: JsPDF): number {
  return (doc.getFontSize() * 1.25 * 25.4) / 72;
}

function font(doc: JsPDF, style: "normal" | "bold", size: number, color: RGB) {
  doc.setFont("helvetica", style).setFontSize(size).setTextColor(...color);
}

/** Shop block on the left, document title and a details box on the right. Returns the y below it. */
function header(doc: JsPDF, shop: ShopInfo, title: string, meta: [string, string][]): number {
  doc.setFillColor(...ACCENT).rect(0, 0, PAGE_W, 3.2, "F");

  const leftW = 108;
  let y = 15;
  font(doc, "bold", 15, INK);
  const name = wrap(doc, shop.name, leftW);
  doc.text(name, M, y);
  y += name.length * lh(doc) - 0.6;

  font(doc, "normal", 8.6, MUTED);
  const details = [
    ...wrap(doc, shop.address, leftW),
    ...(shop.gstin ? [`GSTIN: ${shop.gstin}`] : []),
    ...wrap(doc, [shop.phone, shop.email].filter(Boolean).join("  |  "), leftW),
  ];
  doc.text(details, M, y);
  const leftBottom = y + details.length * lh(doc);

  const boxW = 64;
  const boxX = PAGE_W - M - boxW;
  font(doc, "bold", 12.5, ACCENT);
  doc.text(title, PAGE_W - M, 15, { align: "right" });

  const rowH = 5.4;
  const boxY = 19;
  const boxH = meta.length * rowH + 3.6;
  doc.setFillColor(...PANEL).setDrawColor(...LINE).setLineWidth(0.2);
  doc.roundedRect(boxX, boxY, boxW, boxH, 1.6, 1.6, "FD");
  meta.forEach(([k, v], i) => {
    const ry = boxY + 5.2 + i * rowH;
    font(doc, "normal", 8.2, MUTED);
    doc.text(k, boxX + 3, ry);
    font(doc, "bold", 8.8, INK);
    let size = 8.8;
    while (doc.getTextWidth(v) > boxW - 30 && size > 6.5) doc.setFontSize((size -= 0.3));
    doc.text(v, boxX + boxW - 3, ry, { align: "right" });
  });

  const bottom = Math.max(leftBottom, boxY + boxH) + 4;
  doc.setDrawColor(...LINE).setLineWidth(0.3).line(M, bottom, PAGE_W - M, bottom);
  return bottom + 5;
}

/** A labelled party panel ("Bill to", "To supplier"). Returns the y below it. */
function partyBox(doc: JsPDF, label: string, name: string, lines: string[], x: number, y: number, w: number): number {
  const inner = w - 8;
  font(doc, "bold", 10.5, INK);
  const nameLines = wrap(doc, name || "-", inner);
  const nameH = nameLines.length * lh(doc);
  font(doc, "normal", 8.6, MUTED);
  const body = lines.filter(Boolean).flatMap((l) => wrap(doc, l, inner));
  const bodyH = body.length * lh(doc);
  const h = 7.5 + nameH + bodyH + 2.5;

  doc.setFillColor(...PANEL).setDrawColor(...LINE).setLineWidth(0.2).roundedRect(x, y, w, h, 1.6, 1.6, "FD");
  font(doc, "bold", 7.2, MUTED);
  doc.text(label.toUpperCase(), x + 4, y + 5);
  font(doc, "bold", 10.5, INK);
  doc.text(nameLines, x + 4, y + 10);
  font(doc, "normal", 8.6, MUTED);
  if (body.length) doc.text(body, x + 4, y + 10 + nameH);
  return y + h;
}

function footer(doc: JsPDF, note: string) {
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(...LINE).setLineWidth(0.2).line(M, FOOTER_Y - 4, PAGE_W - M, FOOTER_Y - 4);
    font(doc, "normal", 7.4, MUTED);
    const text = wrap(doc, note, CW - 30)[0] ?? "";
    doc.text(text, M, FOOTER_Y);
    doc.text(`Page ${p} of ${pages}`, PAGE_W - M, FOOTER_Y, { align: "right" });
  }
}

function tableOptions(widths: number[], rightCols: number[]): Partial<UserOptions> {
  const columnStyles: Record<number, { cellWidth: number; halign?: "right" }> = {};
  widths.forEach((w, i) => (columnStyles[i] = { cellWidth: w, ...(rightCols.includes(i) ? { halign: "right" } : {}) }));
  return {
    theme: "plain",
    tableWidth: CW,
    margin: { left: M, right: M, top: 14, bottom: PAGE_H - SAFE_BOTTOM + 4 },
    rowPageBreak: "avoid",
    showHead: "everyPage",
    // The foot row is the document total, so it belongs only after the last line.
    showFoot: "lastPage",
    styles: { font: "helvetica", fontSize: 8.2, cellPadding: { top: 2, bottom: 2, left: 1.8, right: 1.8 }, textColor: INK, overflow: "linebreak", valign: "top" },
    headStyles: { fillColor: TINT, textColor: ACCENT, fontStyle: "bold", fontSize: 7.6 },
    footStyles: { fillColor: PANEL, textColor: INK, fontStyle: "bold" },
    columnStyles,
    didParseCell: (data: CellHookData) => {
      if ((data.section === "head" || data.section === "foot") && rightCols.includes(data.column.index)) {
        data.cell.styles.halign = "right";
      }
    },
    didDrawCell: (data: CellHookData) => {
      if (data.section === "body") {
        const { doc: d, cell } = data as unknown as { doc: JsPDF; cell: { x: number; y: number; width: number; height: number } };
        d.setDrawColor(...LINE).setLineWidth(0.15).line(cell.x, cell.y + cell.height, cell.x + cell.width, cell.y + cell.height);
      }
    },
  };
}

function ensureSpace(doc: JsPDF, y: number, need: number): number {
  if (y + need <= SAFE_BOTTOM) return y;
  doc.addPage();
  return 18;
}

function slug(s: string) {
  return s.replace(/[^A-Za-z0-9-]+/g, "_").replace(/^_+|_+$/g, "");
}

function sizeCell(size: string, sizes: string) {
  return sizes ? `${size}\n(${sizes})` : size;
}

function noteLines(doc: JsPDF, lines: string[], y: number, width: number): number {
  font(doc, "normal", 8.2, MUTED);
  const all = lines.filter(Boolean).flatMap((l) => wrap(doc, l, width));
  if (!all.length) return y;
  y = ensureSpace(doc, y, all.length * lh(doc));
  doc.text(all, M, y);
  return y + all.length * lh(doc);
}

// ---------- Order form ----------

export async function orderPdf(shop: ShopInfo, order: Order, items: OrderItem[]) {
  const { doc, autoTable } = await newDoc();
  let y = header(doc, shop, "ORDER FORM", [
    ["Order no", order.orderNo],
    ["Date", formatDate(order.createdAt)],
    ["Time", formatTime(order.createdAt)],
  ]);
  y = partyBox(
    doc,
    "Customer",
    order.customerName || "Walk-in customer",
    [[order.customerPhone, order.customerGstin && `GSTIN: ${order.customerGstin}`].filter(Boolean).join("   |   "), order.customerAddress],
    M,
    y,
    CW
  );

  autoTable(doc, {
    ...tableOptions([8, 44, 38, 26, 13, 15, 17, 21], [4, 5, 6, 7]),
    startY: y + 5,
    head: [["#", "Article code", "Brand / Fabric", "Size set", "Sets", "Pieces", "Rate (Rs.)", "Amount (Rs.)"]],
    body: items.map((i, n) => [
      n + 1,
      i.articleCode,
      [i.brand, i.fabric].filter(Boolean).join(" / ") || "-",
      sizeCell(i.size, i.sizes),
      i.sets,
      `${i.pieces}\n(${i.sets} x ${i.pcsPerSet})`,
      amt(i.rate),
      amt(i.amount),
    ]),
    foot: [["", "Total", "", "", order.totalSets, order.totalPieces, "", amt(order.totalAmount)]],
  });

  y = lastY(doc) + 6;
  noteLines(doc, ["1 set = one piece of each size in the set (22-28 or 30-36 = 4 pieces). Amounts are before GST; CGST 2.5% + SGST 2.5% is added on the bill.", order.notes ? `Notes: ${order.notes}` : ""], y, CW);

  footer(doc, `Order form ${order.orderNo}  |  ${formatDateTime(order.createdAt)}  |  ${shop.name}`);
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
    ["Place of supply", shop.state],
  ]);
  y = partyBox(
    doc,
    "Bill to",
    bill.customerName,
    [[bill.customerPhone, bill.customerGstin && `GSTIN: ${bill.customerGstin}`].filter(Boolean).join("   |   "), bill.customerAddress],
    M,
    y,
    CW
  );

  autoTable(doc, {
    ...tableOptions([7, 35, 17, 22, 10, 10, 17, 21, 21, 22], [4, 5, 6, 7, 8, 9]),
    startY: y + 5,
    head: [["#", "Article", "HSN", "Size set", "Sets", "Pcs", "Rate", "Amount", "Discount", "Taxable"]],
    body: items.map((i, n) => [
      n + 1,
      i.brand ? `${i.articleCode}\n${i.brand}` : i.articleCode,
      i.hsn || "-",
      sizeCell(i.size, i.sizes),
      i.sets,
      i.pieces,
      amt(i.rate),
      amt(i.grossAmount),
      i.discountPct ? `${i.discountPct}%\n-${amt(i.discountAmount)}` : "-",
      amt(i.taxableAmount),
    ]),
    foot: [["", "Total", "", "", bill.totalSets, bill.totalPieces, "", amt(bill.grossAmount), bill.discountAmount ? `-${amt(bill.discountAmount)}` : "-", amt(bill.taxableAmount)]],
  });

  // Summary: words/notes on the left, totals on the right, signature below. Measured first, drawn as one block.
  const leftW = 96;
  const rightX = M + leftW + 8;
  const rightW = CW - leftW - 8;

  font(doc, "normal", 8.8, INK);
  const words = wrap(doc, amountInWords(bill.total), leftW - 8);
  const wordsH = 7 + words.length * lh(doc) + 2.5;
  font(doc, "normal", 8.2, MUTED);
  const extra = [`Total: ${bill.totalSets} sets = ${bill.totalPieces} pieces`, bill.notes ? `Note: ${bill.notes}` : "", shop.bank ? `Bank: ${shop.bank}` : ""]
    .filter(Boolean)
    .flatMap((l) => wrap(doc, l, leftW));
  const leftH = wordsH + 3 + extra.length * lh(doc);

  const rows: [string, string][] = [
    ["Amount", amt(bill.grossAmount)],
    ...(bill.discountAmount > 0 ? ([["Less discount", `-${amt(bill.discountAmount)}`]] as [string, string][]) : []),
    ["Taxable value", amt(bill.taxableAmount)],
    [`CGST @ ${bill.cgstRate}%`, amt(bill.cgstAmount)],
    [`SGST @ ${bill.sgstRate}%`, amt(bill.sgstAmount)],
    ...(bill.roundOff !== 0 ? ([["Round off", amt(bill.roundOff)]] as [string, string][]) : []),
  ];
  const rowH = 5.6;
  const grandH = 10;
  const rightH = rows.length * rowH + 2 + grandH;
  const signH = 24;

  y = ensureSpace(doc, lastY(doc) + 7, Math.max(leftH, rightH) + signH);

  doc.setFillColor(...PANEL).setDrawColor(...LINE).setLineWidth(0.2).roundedRect(M, y, leftW, wordsH, 1.6, 1.6, "FD");
  font(doc, "bold", 7.2, MUTED);
  doc.text("AMOUNT IN WORDS", M + 4, y + 5);
  font(doc, "normal", 8.8, INK);
  doc.text(words, M + 4, y + 10);
  if (extra.length) {
    font(doc, "normal", 8.2, MUTED);
    doc.text(extra, M, y + wordsH + 5);
  }

  let ry = y + 4;
  for (const [k, v] of rows) {
    font(doc, "normal", 9, MUTED);
    doc.text(k, rightX, ry);
    font(doc, "normal", 9, INK);
    doc.text(v, PAGE_W - M, ry, { align: "right" });
    ry += rowH;
  }
  const gy = ry - 2.6;
  doc.setFillColor(...ACCENT).roundedRect(rightX - 2, gy, rightW + 2, grandH, 1.6, 1.6, "F");
  font(doc, "bold", 11, [255, 255, 255]);
  doc.text("Grand total (Rs.)", rightX + 1, gy + 6.6);
  doc.text(amt(bill.total), PAGE_W - M - 3, gy + 6.6, { align: "right" });

  const sy = y + Math.max(leftH, rightH) + 16;
  doc.setDrawColor(...LINE).setLineWidth(0.3).line(PAGE_W - M - 62, sy, PAGE_W - M, sy);
  font(doc, "normal", 8.2, MUTED);
  doc.text(wrap(doc, `For ${shop.name}`, 62), PAGE_W - M, sy + 4.5, { align: "right" });
  doc.text("Authorised signatory", PAGE_W - M, sy + 4.5 + lh(doc) * wrap(doc, `For ${shop.name}`, 62).length, { align: "right" });

  footer(doc, `Bill ${bill.billNo}  |  ${formatDateTime(bill.createdAt)}  |  ${shop.name}`);
  return { blob: doc.output("blob"), filename: `Bill_${slug(bill.billNo)}_${slug(bill.customerName)}.pdf` };
}

// ---------- Daily supplier sheet ----------

export async function supplierPdf(shop: ShopInfo, day: string, suppliers: SupplierDay[], compiledAt: string) {
  const { doc, autoTable } = await newDoc();
  suppliers.forEach((sup, idx) => {
    if (idx > 0) doc.addPage();
    let y = header(doc, shop, "SUPPLIER ORDER", [
      ["For date", formatDate(day)],
      ["Compiled", formatDateTime(compiledAt)],
    ]);
    const half = (CW - 6) / 2;
    const left = partyBox(doc, "To supplier", sup.supplierName, [sup.supplierGstin ? `GSTIN: ${sup.supplierGstin}` : "GSTIN: not added", sup.supplierPhone ? `Phone: ${sup.supplierPhone}` : ""], M, y, half);
    const right = partyBox(doc, "From", shop.name, [shop.gstin ? `GSTIN: ${shop.gstin}` : "", shop.phone], M + half + 6, y, half);
    y = Math.max(left, right);

    autoTable(doc, {
      ...tableOptions([8, 44, 38, 26, 13, 15, 17, 21], [4, 5, 6, 7]),
      startY: y + 5,
      head: [["#", "Article code", "Brand / Fabric", "Size set", "Sets", "Pieces", "Rate (Rs.)", "Amount (Rs.)"]],
      body: sup.lines.map((l, n) => [n + 1, l.articleCode, [l.brand, l.fabric].filter(Boolean).join(" / ") || "-", sizeCell(l.size, l.sizes), l.sets, l.pieces, amt(l.rate), amt(l.amount)]),
      foot: [["", "Total", "", "", sup.totalSets, sup.totalPieces, "", amt(sup.totalAmount)]],
    });

    noteLines(doc, [`Bills included: ${sup.billNos.join(", ")}`, "Amounts are at the rate on your tag, before GST."], lastY(doc) + 6, CW);
  });
  footer(doc, `Supplier order  |  ${formatDate(day)}  |  ${shop.name}`);
  const name = suppliers.length === 1 ? `_${slug(suppliers[0].supplierName)}` : "_All_suppliers";
  return { blob: doc.output("blob"), filename: `Supplier_order_${day}${name}.pdf` };
}
