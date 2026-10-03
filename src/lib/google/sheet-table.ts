import { getSheetsClient } from "@/lib/google/clients";
import { env } from "@/lib/env";
import type { Table, TableRow } from "@/lib/store/table-types";

const headerCache = new Map<string, string[]>();

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  const maxAttempts = 5;
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      const status = (err as { code?: number; status?: number })?.code ?? (err as { status?: number })?.status;
      attempt += 1;
      if (status !== 429 || attempt >= maxAttempts) throw err;
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt + Math.random() * 500));
    }
  }
}

// Short-lived per-instance cache: one page render reads the same tabs several times.
// Writes clear it instantly here; the TTL only bounds staleness across instances.
const TTL_MS = 10000;
const tableCache = new Map<string, { at: number; promise: Promise<Table> }>();

function invalidate(tab?: string) {
  if (tab) tableCache.delete(tab);
  else tableCache.clear();
}

const ensured = new Map<string, Promise<void>>();

/** Creates the tab if missing and appends any header columns the code expects. Once per tab per instance. */
export function ensureTable(tab: string, headers: string[]): Promise<void> {
  let ready = ensured.get(tab);
  if (!ready) {
    ready = createOrUpgradeTable(tab, headers).catch((err) => {
      ensured.delete(tab);
      throw err;
    });
    ensured.set(tab, ready);
  }
  return ready;
}

async function createOrUpgradeTable(tab: string, headers: string[]): Promise<void> {
  const sheets = getSheetsClient();
  let existing: string[] | null;
  try {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId: env.spreadsheetId, range: `${tab}!1:1` });
    existing = (res.data.values?.[0] ?? []).map(String);
  } catch {
    existing = null;
  }

  if (existing === null) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: env.spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: tab } } }] },
    });
    existing = [];
  }

  const missing = headers.filter((h) => !existing!.includes(h));
  if (missing.length > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: env.spreadsheetId,
      range: `${tab}!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[...existing, ...missing]] },
    });
    headerCache.delete(tab);
    invalidate(tab);
  }
}

async function getHeaders(tab: string): Promise<string[]> {
  const cached = headerCache.get(tab);
  if (cached) return cached;
  const sheets = getSheetsClient();
  const res = await withRetry(() =>
    sheets.spreadsheets.values.get({ spreadsheetId: env.spreadsheetId, range: `${tab}!1:1` })
  );
  const headers = (res.data.values?.[0] ?? []).map(String);
  headerCache.set(tab, headers);
  return headers;
}

export function readTable(tab: string): Promise<Table> {
  const hit = tableCache.get(tab);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.promise;
  const promise = fetchTable(tab);
  tableCache.set(tab, { at: Date.now(), promise });
  promise.catch(() => tableCache.delete(tab));
  return promise;
}

async function fetchTable(tab: string): Promise<Table> {
  const sheets = getSheetsClient();
  const headers = await getHeaders(tab);
  const res = await withRetry(() =>
    sheets.spreadsheets.values.get({
      spreadsheetId: env.spreadsheetId,
      range: `${tab}!A2:${columnLetter(headers.length)}`,
    })
  );
  const rows = (res.data.values ?? [])
    .map((row, i) => ({ rowNumber: i + 2, data: rowArrayToObject(headers, row as string[]) }))
    .filter((r) => Object.values(r.data).some((v) => v !== ""));
  return { headers, rows };
}

function rowArrayToObject(headers: string[], row: string[]): TableRow {
  const obj: TableRow = {};
  headers.forEach((h, i) => {
    obj[h] = row[i] ?? "";
  });
  return obj;
}

function objectToRowArray(headers: string[], obj: TableRow): string[] {
  return headers.map((h) => obj[h] ?? "");
}

export async function appendRow(tab: string, obj: TableRow): Promise<void> {
  const sheets = getSheetsClient();
  const headers = await getHeaders(tab);
  await withRetry(() =>
    sheets.spreadsheets.values.append({
      spreadsheetId: env.spreadsheetId,
      range: `${tab}!A:A`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [objectToRowArray(headers, obj)] },
    })
  );
  invalidate(tab);
}

export async function appendRows(tab: string, objs: TableRow[]): Promise<void> {
  if (objs.length === 0) return;
  const sheets = getSheetsClient();
  const headers = await getHeaders(tab);
  await withRetry(() =>
    sheets.spreadsheets.values.append({
      spreadsheetId: env.spreadsheetId,
      range: `${tab}!A:A`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: objs.map((o) => objectToRowArray(headers, o)) },
    })
  );
  invalidate(tab);
}

export async function updateRow(tab: string, rowNumber: number, obj: TableRow): Promise<void> {
  const sheets = getSheetsClient();
  const headers = await getHeaders(tab);
  await withRetry(() =>
    sheets.spreadsheets.values.update({
      spreadsheetId: env.spreadsheetId,
      range: `${tab}!A${rowNumber}:${columnLetter(headers.length)}${rowNumber}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [objectToRowArray(headers, obj)] },
    })
  );
  invalidate(tab);
}

/** Blanks a row so later reads skip it, without shifting the rows below. */
export async function clearRow(tab: string, rowNumber: number): Promise<void> {
  const sheets = getSheetsClient();
  const headers = await getHeaders(tab);
  await withRetry(() =>
    sheets.spreadsheets.values.clear({
      spreadsheetId: env.spreadsheetId,
      range: `${tab}!A${rowNumber}:${columnLetter(headers.length)}${rowNumber}`,
    })
  );
  invalidate(tab);
}

function columnLetter(count: number): string {
  let n = count;
  let letters = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters || "A";
}
