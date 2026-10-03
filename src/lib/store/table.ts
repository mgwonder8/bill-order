import { sheetsConfigured } from "@/lib/env";
import type { Table, TableRow } from "@/lib/store/table-types";
import * as local from "@/lib/store/local-table";

/**
 * One table API over two stores. Google Sheets is the real backing store; when no
 * spreadsheet is configured we fall back to a local JSON file so the app runs and
 * can be tested immediately. The choice is made per call, not at module load, so
 * adding credentials to .env.local takes effect on restart without code changes.
 */
async function sheets() {
  return await import("@/lib/google/sheet-table");
}

export function usingSheets(): boolean {
  return sheetsConfigured();
}

export async function ensureTable(tab: string, headers: string[]): Promise<void> {
  return usingSheets() ? (await sheets()).ensureTable(tab, headers) : local.ensureTable(tab, headers);
}

export async function readTable(tab: string): Promise<Table> {
  return usingSheets() ? (await sheets()).readTable(tab) : local.readTable(tab);
}

export async function appendRow(tab: string, obj: TableRow): Promise<void> {
  return usingSheets() ? (await sheets()).appendRow(tab, obj) : local.appendRow(tab, obj);
}

export async function appendRows(tab: string, objs: TableRow[]): Promise<void> {
  return usingSheets() ? (await sheets()).appendRows(tab, objs) : local.appendRows(tab, objs);
}

export async function updateRow(tab: string, rowNumber: number, obj: TableRow): Promise<void> {
  return usingSheets() ? (await sheets()).updateRow(tab, rowNumber, obj) : local.updateRow(tab, rowNumber, obj);
}

export async function clearRow(tab: string, rowNumber: number): Promise<void> {
  return usingSheets() ? (await sheets()).clearRow(tab, rowNumber) : local.clearRow(tab, rowNumber);
}

export async function findRowById(tab: string, id: string) {
  const { rows } = await readTable(tab);
  return rows.find((r) => r.data.id === id) ?? null;
}

export async function deleteRowById(tab: string, id: string): Promise<boolean> {
  const row = await findRowById(tab, id);
  if (!row) return false;
  await clearRow(tab, row.rowNumber);
  return true;
}
