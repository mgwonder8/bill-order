import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { Table, TableRow } from "@/lib/store/table-types";

/**
 * File-backed stand-in for Google Sheets, used when no spreadsheet is configured
 * so the app is testable out of the box. Same shape as sheet-table, including the
 * "blank the row instead of shifting" delete, so switching stores changes nothing
 * above this layer. Single-process only: writes are serialised through one promise
 * chain, which is enough for local testing but not for a multi-instance deploy.
 */
const DB_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DB_DIR, "db.json");

type Db = Record<string, { headers: string[]; rows: (TableRow | null)[] }>;

// Pages and route handlers are bundled separately, so module state is not shared
// between them. The file is re-read on every call (no in-memory copy that could go
// stale) and the write queue lives on globalThis so every bundle uses the same one.
const g = globalThis as unknown as { __tagbillDbQueue?: Promise<unknown> };

async function load(): Promise<Db> {
  try {
    return JSON.parse(await readFile(DB_FILE, "utf8")) as Db;
  } catch {
    return {};
  }
}

async function save(db: Db): Promise<void> {
  await mkdir(DB_DIR, { recursive: true });
  await writeFile(DB_FILE, JSON.stringify(db, null, 2), "utf8");
}

/** Serialises read-modify-write cycles so concurrent requests can't clobber each other. */
function transact<T>(fn: (db: Db) => Promise<T> | T): Promise<T> {
  const run = (g.__tagbillDbQueue ?? Promise.resolve()).then(async () => {
    const db = await load();
    const result = await fn(db);
    await save(db);
    return result;
  });
  g.__tagbillDbQueue = run.catch(() => {});
  return run;
}

export async function ensureTable(tab: string, headers: string[]): Promise<void> {
  const t = (await load())[tab];
  if (t && headers.every((h) => t.headers.includes(h))) return;
  return transact((db) => {
    const table = (db[tab] ??= { headers: [], rows: [] });
    for (const h of headers) if (!table.headers.includes(h)) table.headers.push(h);
  });
}

export async function readTable(tab: string): Promise<Table> {
  const db = await load();
  const t = db[tab] ?? { headers: [], rows: [] };
  return {
    headers: t.headers,
    rows: t.rows
      .map((data, i) => ({ rowNumber: i + 2, data: data ?? {} }))
      .filter((r) => Object.values(r.data).some((v) => v !== "")),
  };
}

export function appendRow(tab: string, obj: TableRow): Promise<void> {
  return appendRows(tab, [obj]);
}

export function appendRows(tab: string, objs: TableRow[]): Promise<void> {
  return transact((db) => {
    const t = (db[tab] ??= { headers: [], rows: [] });
    for (const obj of objs) {
      for (const h of Object.keys(obj)) if (!t.headers.includes(h)) t.headers.push(h);
      t.rows.push(obj);
    }
  });
}

export function updateRow(tab: string, rowNumber: number, obj: TableRow): Promise<void> {
  return transact((db) => {
    const t = (db[tab] ??= { headers: [], rows: [] });
    for (const h of Object.keys(obj)) if (!t.headers.includes(h)) t.headers.push(h);
    t.rows[rowNumber - 2] = obj;
  });
}

export function clearRow(tab: string, rowNumber: number): Promise<void> {
  return transact((db) => {
    const t = db[tab];
    if (t) t.rows[rowNumber - 2] = null;
  });
}
