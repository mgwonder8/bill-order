"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Minus, Plus, Search, ShoppingBag, Trash2, XCircle } from "lucide-react";
import { formatINR, lineMoney } from "@/lib/money";
import type { ArticleSize, Order, OrderItem } from "@/lib/types";
import { TagScanner, type SavedTag } from "@/components/tag-scanner";

type Line = {
  key: string;
  sizeId: string;
  articleCode: string;
  brand: string;
  fabric: string;
  supplierName: string;
  supplierGstin: string;
  supplierPhone: string;
  size: string;
  sizes: string;
  pcsPerSet: number;
  rate: number;
  sets: number;
};

type Toast = { tone: "ok" | "bad"; text: string } | null;

let seq = 0;
const key = () => `l${seq++}`;

function fromCatalog(z: ArticleSize, sets: number): Line {
  return {
    key: key(),
    sizeId: z.id,
    articleCode: z.articleCode,
    brand: z.brand,
    fabric: z.fabric,
    supplierName: z.supplierName,
    supplierGstin: z.supplierGstin,
    supplierPhone: z.supplierPhone,
    size: z.size,
    sizes: z.sizes,
    pcsPerSet: z.pcsPerSet,
    rate: z.rate,
    sets,
  };
}

function fromSaved(i: OrderItem): Line {
  return { ...i, key: key() };
}

function sameLine(a: Line, b: Line) {
  if (a.sizeId || b.sizeId) return a.sizeId === b.sizeId;
  return a.articleCode.toLowerCase() === b.articleCode.toLowerCase() && a.size === b.size && a.rate === b.rate;
}

function mergeCatalog(list: ArticleSize[], fresh: ArticleSize[]): ArticleSize[] {
  const ids = new Set(fresh.map((z) => z.id));
  return [...fresh, ...list.filter((z) => !ids.has(z.id))];
}

export function OrderClient({
  catalog: savedCatalog,
  initial,
  preset = [],
}: {
  catalog: ArticleSize[];
  initial?: { order: Order; items: OrderItem[] };
  preset?: ArticleSize[];
}) {
  const router = useRouter();
  const [catalog, setCatalog] = useState<ArticleSize[]>(savedCatalog);
  const [lines, setLines] = useState<Line[]>(
    () => initial?.items.map(fromSaved) ?? preset.map((z) => fromCatalog(z, 1))
  );
  const [customerName, setCustomerName] = useState(initial?.order.customerName ?? "");
  const [customerPhone, setCustomerPhone] = useState(initial?.order.customerPhone ?? "");
  const [customerGstin, setCustomerGstin] = useState(initial?.order.customerGstin ?? "");
  const [customerAddress, setCustomerAddress] = useState(initial?.order.customerAddress ?? "");
  const [notes, setNotes] = useState(initial?.order.notes ?? "");
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<Toast>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback((t: Toast) => {
    clearTimeout(toastTimer.current);
    setToast(t);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const linesRef = useRef(lines);
  useEffect(() => {
    linesRef.current = lines;
  }, [lines]);

  const add = useCallback(
    (line: Line) => {
      const existing = linesRef.current.find((l) => sameLine(l, line));
      if (existing) {
        const sets = existing.sets + line.sets;
        show({ tone: "ok", text: `${line.articleCode} (${line.size}) – now ${sets} sets` });
        setLines((ls) => ls.map((l) => (l.key === existing.key ? { ...l, sets: l.sets + line.sets } : l)));
        return;
      }
      show({ tone: "ok", text: `Added ${line.articleCode} (${line.size}) – ${line.sets} set${line.sets === 1 ? "" : "s"}` });
      setLines((ls) => [line, ...ls]);
    },
    [show]
  );

  function onTagSaved(saved: SavedTag) {
    setCatalog((c) => mergeCatalog(c, saved.sizes));
    for (const z of saved.sizes) add(fromCatalog(z, 1));
    show({
      tone: "ok",
      text: `Saved ${saved.sizes[0]?.articleCode ?? "tag"} and added ${saved.sizes.length} size set${saved.sizes.length === 1 ? "" : "s"} at 1 set each`,
    });
  }

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? catalog.filter((z) => `${z.articleCode} ${z.brand} ${z.supplierName} ${z.size}`.toLowerCase().includes(q))
      : catalog;
    return list.slice(0, 8);
  }, [catalog, query]);

  function setSets(k: string, sets: number) {
    setLines((ls) => ls.map((l) => (l.key === k ? { ...l, sets: Math.max(1, Math.min(9999, Math.round(sets) || 1)) } : l)));
  }

  const totals = lines.reduce(
    (t, l) => {
      const m = lineMoney(l);
      return { sets: t.sets + l.sets, pieces: t.pieces + m.pieces, amount: t.amount + m.gross };
    },
    { sets: 0, pieces: 0, amount: 0 }
  );

  async function save() {
    setError(null);
    if (lines.length === 0) return setError("Scan a tag or pick an article to add an item.");
    setSaving(true);
    try {
      const res = await fetch(initial ? `/api/orders/${initial.order.id}` : "/api/orders", {
        method: initial ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerPhone,
          customerGstin,
          customerAddress,
          notes,
          lines: [...lines].reverse().map((l) => ({
            sizeId: l.sizeId,
            articleCode: l.articleCode,
            brand: l.brand,
            fabric: l.fabric,
            supplierName: l.supplierName,
            supplierGstin: l.supplierGstin,
            supplierPhone: l.supplierPhone,
            size: l.size,
            pcsPerSet: l.pcsPerSet,
            sets: l.sets,
            rate: l.rate,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save this order.");
        return;
      }
      router.push(`/orders/${data.orderId}`);
      router.refresh();
    } catch {
      setError("Could not reach the server while saving.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,400px)_minmax(0,1fr)] xl:items-start">
      <div className="space-y-5 xl:sticky xl:top-6">
        <section className="card p-4">
          <TagScanner onSaved={onTagSaved} saveLabel="Save & add to order" />
          {toast && (
            <p
              className={`rise mt-3 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold ${
                toast.tone === "ok" ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"
              }`}
            >
              {toast.tone === "ok" ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
              {toast.text}
            </p>
          )}
        </section>

        <section className="card p-4">
          <h2 className="font-bold">Already saved? Pick it</h2>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
            <input
              className="field pl-10"
              placeholder="Type article code, brand or supplier"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {catalog.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Scanned articles show up here to reuse.</p>
          ) : (
            <ul className="mt-2 divide-y divide-line">
              {results.map((z) => (
                <li key={z.id}>
                  <button
                    type="button"
                    onClick={() => add(fromCatalog(z, 1))}
                    className="flex w-full items-center gap-3 py-2.5 text-left hover:text-accent"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">
                        {z.articleCode} · Size {z.size}
                      </p>
                      <p className="truncate text-sm text-muted">
                        {formatINR(z.rate)}/pc · {z.supplierName}
                      </p>
                    </div>
                    <span className="btn btn-outline btn-sm">
                      <Plus size={16} /> Add
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="space-y-5 pb-28 md:pb-0">
        <section className="card p-4 md:p-5">
          <h2 className="font-bold">
            Items in this order
            {lines.length > 0 && <span className="ml-1.5 font-semibold text-muted">{lines.length}</span>}
          </h2>

          {lines.length === 0 ? (
            <div className="py-10 text-center">
              <ShoppingBag className="mx-auto text-line" size={40} strokeWidth={1.5} />
              <p className="mt-2 text-sm text-muted">Scan a tag and its sizes appear here.</p>
            </div>
          ) : (
            <ul className="mt-3 space-y-3">
              {lines.map((l) => {
                const m = lineMoney(l);
                return (
                  <li key={l.key} className="rise rounded-xl border border-line p-3">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-extrabold">
                          {l.articleCode} <span className="font-bold text-accent">· {l.size}</span>
                        </p>
                        <p className="truncate text-sm text-muted">
                          {formatINR(l.rate)}/pc · 1 set = {l.pcsPerSet} pcs{l.supplierName && ` · ${l.supplierName}`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
                        className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger"
                        aria-label={`Remove ${l.articleCode} size ${l.size}`}
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center rounded-xl border border-line">
                        <button type="button" className="grid h-11 w-11 place-items-center rounded-l-xl text-foreground active:bg-black/[0.05]" onClick={() => setSets(l.key, l.sets - 1)} aria-label="One set less">
                          <Minus size={18} />
                        </button>
                        <input
                          className="h-11 w-14 border-x border-line bg-transparent text-center text-lg font-extrabold outline-none tnum"
                          type="number"
                          inputMode="numeric"
                          min="1"
                          value={l.sets}
                          onChange={(e) => setSets(l.key, Number(e.target.value))}
                          aria-label="Number of sets"
                        />
                        <button type="button" className="grid h-11 w-11 place-items-center rounded-r-xl text-accent active:bg-accent-soft" onClick={() => setSets(l.key, l.sets + 1)} aria-label="One set more">
                          <Plus size={18} />
                        </button>
                        </div>
                        <span className="whitespace-nowrap text-sm text-muted">
                          set{l.sets === 1 ? "" : "s"} = <b className="text-foreground tnum">{m.pieces} pcs</b>
                        </span>
                      </div>
                      <p className="font-extrabold tnum">{formatINR(m.gross)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="card p-4 md:p-5">
          <h2 className="font-bold">
            Customer <span className="font-medium text-muted">· optional</span>
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field id="cname" label="Customer / shop name" value={customerName} onChange={setCustomerName} />
            <Field id="cphone" label="Phone (for WhatsApp)" value={customerPhone} onChange={setCustomerPhone} inputMode="tel" />
            <Field id="cgst" label="Customer GST number" value={customerGstin} onChange={(v) => setCustomerGstin(v.toUpperCase())} />
            <Field id="caddr" label="Address" value={customerAddress} onChange={setCustomerAddress} />
            <div className="sm:col-span-2">
              <Field id="notes" label="Notes" value={notes} onChange={setNotes} />
            </div>
          </div>
        </section>

        {error && <p className="alert-error">{error}</p>}

        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:static md:rounded-[1.1rem] md:border md:px-5 md:py-4 md:shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-lg font-extrabold tnum">
                {totals.sets} sets · {totals.pieces} pcs
              </p>
              <p className="text-sm text-muted tnum">{formatINR(totals.amount)} before GST</p>
            </div>
            <button type="button" onClick={save} disabled={saving || lines.length === 0} className="btn btn-primary btn-lg">
              {saving && <Loader2 className="animate-spin" size={18} />}
              {initial ? "Save changes" : "Save order"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  inputMode,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  inputMode?: "tel" | "text";
}) {
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <input id={id} className="field" value={value} inputMode={inputMode} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
