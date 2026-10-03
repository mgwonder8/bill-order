/** Rupees, rounded to paise. Avoids the 0.1 + 0.2 drift when amounts are summed. */
export function money(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function formatINR(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(n) || 0);
}

/** PDF fonts have no rupee glyph, so documents print "Rs." instead. */
export function formatRs(n: number): string {
  return `Rs. ${new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0)}`;
}

export function num(v: string | number | null | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Fixed GST for this shop: 5% on garments, split as 2.5% CGST and 2.5% SGST. */
export const CGST_RATE = 2.5;
export const SGST_RATE = 2.5;

export type LineMoney = { pieces: number; gross: number; discountAmount: number; taxable: number };

/** Money for one line. Quantity is always in pieces; sets are only how it is entered. */
export function lineMoney(l: { pieces: number; rate: number; discountPct?: number }): LineMoney {
  const pieces = Math.max(0, Math.round(Number(l.pieces) || 0));
  const gross = money(pieces * (Number(l.rate) || 0));
  const pct = Math.min(100, Math.max(0, Number(l.discountPct) || 0));
  const discountAmount = money((gross * pct) / 100);
  return { pieces, gross, discountAmount, taxable: money(gross - discountAmount) };
}

export type BillMoney = {
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
};

export function billMoney(lines: { sets: number; pieces: number; rate: number; discountPct?: number }[]): BillMoney {
  let totalSets = 0;
  let totalPieces = 0;
  let grossAmount = 0;
  let discountAmount = 0;
  for (const l of lines) {
    const m = lineMoney(l);
    totalSets += Number(l.sets) || 0;
    totalPieces += m.pieces;
    grossAmount += m.gross;
    discountAmount += m.discountAmount;
  }
  grossAmount = money(grossAmount);
  discountAmount = money(discountAmount);
  const taxableAmount = money(grossAmount - discountAmount);
  const cgstAmount = money((taxableAmount * CGST_RATE) / 100);
  const sgstAmount = money((taxableAmount * SGST_RATE) / 100);
  const exact = money(taxableAmount + cgstAmount + sgstAmount);
  const total = Math.round(exact);
  return {
    totalSets,
    totalPieces,
    grossAmount,
    discountAmount,
    taxableAmount,
    cgstRate: CGST_RATE,
    cgstAmount,
    sgstRate: SGST_RATE,
    sgstAmount,
    roundOff: money(total - exact),
    total,
  };
}
