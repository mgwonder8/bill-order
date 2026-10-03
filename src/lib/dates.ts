const TZ = "Asia/Kolkata";

/** "2026-10-02" in Indian time, used to group a day's bills. */
export function istDay(iso: string | Date = new Date()): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** "2026-10-02" plus or minus whole days. */
export function shiftDay(day: string, delta: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** "02 Oct 2026" */
export function formatDate(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso.length === 10 ? `${iso}T12:00:00+05:30` : iso) : iso;
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", { timeZone: TZ, day: "2-digit", month: "short", year: "numeric" }).format(d);
}

/** "11:45 am" */
export function formatTime(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", { timeZone: TZ, hour: "numeric", minute: "2-digit", hour12: true }).format(d);
}

/** "02 Oct 2026, 11:45 am" */
export function formatDateTime(iso: string | Date): string {
  const date = formatDate(iso);
  const time = formatTime(iso);
  return date && time ? `${date}, ${time}` : date;
}
