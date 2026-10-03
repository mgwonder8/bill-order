/**
 * The shop sells in sets. A set is one piece of every size in a size band, and
 * the two bands on these tags are 22 to 28 and 30 to 36, so one set is 4 pieces.
 */
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
 * into a set: a short label, the sizes in it, and pieces per set.
 */
export function toSizeSet(input: string): SizeSet {
  const raw = String(input ?? "").trim();
  const range = /^(\d+)\s*(?:-|to|–)\s*(\d+)$/i.exec(raw);
  if (range) {
    const group = SET_GROUPS.find((g) => g.sizes[0] === range[1] && g.sizes[g.sizes.length - 1] === range[2]);
    if (group) return { label: group.label, sizes: [...group.sizes], pcsPerSet: group.sizes.length };
    const from = Number(range[1]);
    const to = Number(range[2]);
    const sizes: string[] = [];
    for (let s = from; s <= to && sizes.length < 20; s += 2) sizes.push(String(s));
    return { label: `${from}-${to}`, sizes, pcsPerSet: sizes.length || 1 };
  }

  const sizes = splitSizes(raw);
  if (sizes.length === 0) return { label: "", sizes: [], pcsPerSet: 1 };

  // A single numeric size inside a band means the whole band's set.
  if (sizes.length === 1) {
    const group = SET_GROUPS.find((g) => (g.sizes as readonly string[]).includes(sizes[0]));
    if (group) return { label: group.label, sizes: [...group.sizes], pcsPerSet: group.sizes.length };
    return { label: sizes[0], sizes, pcsPerSet: 1 };
  }

  const group = SET_GROUPS.find(
    (g) => g.sizes.length === sizes.length && g.sizes.every((s, i) => s === sizes[i])
  );
  if (group) return { label: group.label, sizes: [...group.sizes], pcsPerSet: group.sizes.length };
  return { label: `${sizes[0]}-${sizes[sizes.length - 1]}`, sizes, pcsPerSet: sizes.length };
}

export function setsToPieces(sets: number, pcsPerSet: number): number {
  return (Number(sets) || 0) * (Number(pcsPerSet) || 1);
}
