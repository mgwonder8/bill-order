import { supabase } from "@/lib/supabase";
import { TABLE_DEFS, type Column, type TableDef } from "@/lib/store/schema";
import type { Table, TableRow } from "@/lib/store/table-types";

/**
 * Row store on Supabase Postgres. Each logical table (see schema.ts) is a real table
 * with typed columns (supabase/schema.sql). The data layer works with string rows, so
 * values are converted to column types on the way in and back to strings on the way out.
 * `row_no` is the insertion-order counter used as the row number.
 */
const PAGE = 1000;

function def(tab: string): TableDef {
  const d = TABLE_DEFS[tab];
  if (!d) throw new Error(`Unknown table: ${tab}`);
  return d;
}

function fail(action: string, table: string, error: { message: string }): never {
  throw new Error(`Database ${action} on ${table} failed: ${error.message}`);
}

function toDb(column: Column, value: string): string | number | null {
  switch (column.type) {
    case "int": {
      const n = Math.round(Number(value));
      return value === "" || Number.isNaN(n) ? 0 : n;
    }
    case "num": {
      const n = Number(value);
      return value === "" || Number.isNaN(n) ? 0 : n;
    }
    case "ts":
      return value === "" ? null : new Date(value).toISOString();
    case "ref":
      return value === "" ? null : value;
    default:
      return value;
  }
}

function fromDb(column: Column, value: unknown): string {
  if (value === null || value === undefined) return "";
  if (column.type === "ts") return new Date(String(value)).toISOString();
  return String(value);
}

function encode(d: TableDef, row: TableRow, onlyGiven: boolean): Record<string, string | number | null> {
  const out: Record<string, string | number | null> = {};
  for (const column of d.columns) {
    const value = row[column.key];
    if (value === undefined) {
      if (!onlyGiven) out[column.col] = toDb(column, "");
      continue;
    }
    out[column.col] = toDb(column, value);
  }
  return out;
}

function decode(d: TableDef, record: Record<string, unknown>): TableRow {
  const row: TableRow = {};
  for (const column of d.columns) row[column.key] = fromDb(column, record[column.col]);
  return row;
}

export async function readTable(tab: string): Promise<Table> {
  const d = def(tab);
  const rows: Table["rows"] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase()
      .from(d.table)
      .select("*")
      .order("row_no", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) fail("read", d.table, error);
    for (const r of data ?? []) rows.push({ rowNumber: r.row_no as number, data: decode(d, r) });
    if (!data || data.length < PAGE) break;
  }
  return { rows };
}

export async function appendRow(tab: string, obj: TableRow): Promise<void> {
  return appendRows(tab, [obj]);
}

export async function appendRows(tab: string, objs: TableRow[]): Promise<void> {
  if (objs.length === 0) return;
  const d = def(tab);
  const { error } = await supabase().from(d.table).insert(objs.map((o) => encode(d, o, false)));
  if (error) fail("insert", d.table, error);
}

export async function updateRow(tab: string, rowNumber: number, obj: TableRow): Promise<void> {
  const d = def(tab);
  const { error } = await supabase().from(d.table).update(encode(d, obj, true)).eq("row_no", rowNumber);
  if (error) fail("update", d.table, error);
}

export async function clearRow(tab: string, rowNumber: number): Promise<void> {
  const d = def(tab);
  const { error } = await supabase().from(d.table).delete().eq("row_no", rowNumber);
  if (error) fail("delete", d.table, error);
}

export async function findRowById(tab: string, id: string) {
  const d = def(tab);
  const { data, error } = await supabase().from(d.table).select("*").eq("id", id).maybeSingle();
  if (error) fail("read", d.table, error);
  return data ? { rowNumber: data.row_no as number, data: decode(d, data) } : null;
}

export async function deleteRowById(tab: string, id: string): Promise<boolean> {
  const row = await findRowById(tab, id);
  if (!row) return false;
  await clearRow(tab, row.rowNumber);
  return true;
}
