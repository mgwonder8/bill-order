/**
 * Suppliers sell in sets and every set is 24 pieces, whatever the size range.
 * The size range (22-28 or 30-36) still matters because each range has its own rate.
 */
export const SET_PCS = 24;

export const SET_GROUPS = [
  { label: "22-28", sizes: ["22", "24", "26", "28"] },
  { label: "30-36", sizes: ["30", "32", "34", "36"] },
] as const;

export type SizeSet = { label: string; sizes: string[]; pcsPerSet: number };

function splitSizes(input: string): string[] {
  return input
    .split(/[\/,\s|]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Turns whatever was written or scanned ("22/24/26/28", "22-28", "26", "S/M/L")
 * into a size range: a short label and the sizes in it.
 */
export function toSizeSet(input: string): SizeSet {
  const raw = String(input ?? "").trim();
  const range = /^(\d+)\s*(?:-|to|–)\s*(\d+)$/i.exec(raw);
  if (range) {
    const group = SET_GROUPS.find((g) => g.sizes[0] === range[1] && g.sizes[g.sizes.length - 1] === range[2]);
    if (group) return { label: group.label, sizes: [...group.sizes], pcsPerSet: SET_PCS };
    const from = Number(range[1]);
    const to = Number(range[2]);
    const sizes: string[] = [];
    for (let s = from; s <= to && sizes.length < 20; s += 2) sizes.push(String(s));
    return { label: `${from}-${to}`, sizes, pcsPerSet: SET_PCS };
  }

  const sizes = splitSizes(raw);
  if (sizes.length === 0) return { label: "", sizes: [], pcsPerSet: SET_PCS };

  // A single numeric size inside a band means the whole band.
  if (sizes.length === 1) {
    const group = SET_GROUPS.find((g) => (g.sizes as readonly string[]).includes(sizes[0]));
    if (group) return { label: group.label, sizes: [...group.sizes], pcsPerSet: SET_PCS };
    return { label: sizes[0], sizes, pcsPerSet: SET_PCS };
  }

  const group = SET_GROUPS.find((g) => g.sizes.length === sizes.length && g.sizes.every((s, i) => s === sizes[i]));
  if (group) return { label: group.label, sizes: [...group.sizes], pcsPerSet: SET_PCS };
  return { label: `${sizes[0]}-${sizes[sizes.length - 1]}`, sizes, pcsPerSet: SET_PCS };
}

/** "2 sets + 5 pcs", "2 sets", "5 pcs" for a number of pieces. */
export function qtyLabel(pieces: number): string {
  const n = Math.round(Number(pieces) || 0);
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  const sets = Math.floor(abs / SET_PCS);
  const loose = abs % SET_PCS;
  const parts = [sets ? `${sets} set${sets === 1 ? "" : "s"}` : "", loose || !sets ? `${loose} pc${loose === 1 ? "" : "s"}` : ""].filter(Boolean);
  return sign + parts.join(" + ");
}

/** The same quantity written as entered on a line: sets and loose pieces. */
export function lineQtyLabel(sets: number, loose: number): string {
  const parts = [sets ? `${sets} set${sets === 1 ? "" : "s"}` : "", loose ? `${loose} pc${loose === 1 ? "" : "s"}` : ""].filter(Boolean);
  return parts.join(" + ") || "0 pcs";
}
