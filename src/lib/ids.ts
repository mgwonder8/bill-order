import { randomUUID } from "crypto";

export function newId(prefix: string): string {
  return `${prefix}_${randomUUID().slice(0, 12)}`;
}

/** Next sequential document number, e.g. INV-0007, from the numbers already used. */
export function nextDocNumber(prefix: string, existing: string[]): string {
  const max = existing.reduce((acc, n) => {
    const m = /(\d+)\s*$/.exec(n ?? "");
    return m ? Math.max(acc, Number(m[1])) : acc;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(4, "0")}`;
}
