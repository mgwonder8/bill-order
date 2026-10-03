import { supabase } from "@/lib/supabase";
import type { Table, TableRow } from "@/lib/store/table-types";

/**
 * Row store on Supabase Postgres. Every logical table (see schema.ts) lives in
 * public.tagbill_rows keyed by `tab`; the identity column doubles as the row number.
 */
const TABLE = "tagbill_rows";
const PAGE = 1000;

function fail(action: string, error: { message: string }): never {
  throw new Error(`Database ${action} failed: ${error.message}`);
}

export async function readTable(tab: string): Promise<Table> {
  const rows: Table["rows"] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase()
      .from(TABLE)
      .select("id, data")
      .eq("tab", tab)
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) fail("read", error);
    for (const r of data ?? []) rows.push({ rowNumber: r.id as number, data: r.data as TableRow });
    if (!data || data.length < PAGE) break;
  }
  return { rows };
}

export async function appendRow(tab: string, obj: TableRow): Promise<void> {
  return appendRows(tab, [obj]);
}

export async function appendRows(tab: string, objs: TableRow[]): Promise<void> {
  if (objs.length === 0) return;
  const { error } = await supabase().from(TABLE).insert(objs.map((data) => ({ tab, data })));
  if (error) fail("insert", error);
}

export async function updateRow(tab: string, rowNumber: number, obj: TableRow): Promise<void> {
  const { error } = await supabase().from(TABLE).update({ data: obj }).eq("tab", tab).eq("id", rowNumber);
  if (error) fail("update", error);
}

export async function clearRow(tab: string, rowNumber: number): Promise<void> {
  const { error } = await supabase().from(TABLE).delete().eq("tab", tab).eq("id", rowNumber);
  if (error) fail("delete", error);
}

export async function findRowById(tab: string, id: string) {
  const { data, error } = await supabase().from(TABLE).select("id, data").eq("tab", tab).eq("data->>id", id).maybeSingle();
  if (error) fail("read", error);
  return data ? { rowNumber: data.id as number, data: data.data as TableRow } : null;
}

export async function deleteRowById(tab: string, id: string): Promise<boolean> {
  const row = await findRowById(tab, id);
  if (!row) return false;
  await clearRow(tab, row.rowNumber);
  return true;
}
