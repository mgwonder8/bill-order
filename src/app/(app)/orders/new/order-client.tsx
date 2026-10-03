"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, PackagePlus, Phone, Plus, Search, Trash2, XCircle } from "lucide-react";
import { formatINR, lineMoney } from "@/lib/money";
import { SET_PCS } from "@/lib/sets";
import type { ArticleSize, Order, OrderItem } from "@/lib/types";
import { TagScanner, type SavedTag } from "@/components/tag-scanner";
import { Money, Stepper } from "@/components/inputs";

type Line = {
  key: string;
  sizeId: string;
  articleCode: string;
  brand: string;
  supplierName: string;
  supplierPhone: string;
  supplierGstin: string;
  size: string;
  sizes: string;
  sets: number;
  rate: string;
  sellRate: string;
};

type Toast = { tone: "ok" | "bad"; text: string } | null;

let seq = 0;
const key = () => `l${seq++}`;
const norm = (v: string) => v.trim().toUpperCase().replace(/\s+/g, " ");
const price = (v: number) => (v > 0 ? String(v) : "");

function fromCatalog(z: ArticleSize): Line {
  return {
    key: key(),
    sizeId: z.id,
    articleCode: z.articleCode,
    brand: z.brand,
    supplierName: z.supplierName,
    supplierPhone: z.supplierPhone,
    supplierGstin: z.supplierGstin,
    size: z.size,
    sizes: z.sizes,
    sets: 1,
    rate: price(z.rate),
    sellRate: price(z.sellRate),
  };
}

function fromSaved(i: OrderItem): Line {
  return {
    key: key(),
    sizeId: i.sizeId,
    articleCode: i.articleCode,
    brand: i.brand,
    supplierName: i.supplierName,
    supplierPhone: i.supplierPhone,
    supplierGstin: i.supplierGstin,
    size: i.size,
    sizes: i.sizes,
    sets: i.sets,
    rate: price(i.rate),
    sellRate: price(i.sellRate),
  };
}

function mergeCatalog(list: ArticleSize[], fresh: ArticleSize[]): ArticleSize[] {
  const ids = new Set(fresh.map((z) => z.id));
  return [...fresh, ...list.filter((z) => !ids.has(z.id))];
}

/** Builds a supplier order: scanned articles, sets of 24, supplier rate and the shop's selling price. */
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
  const [lines, setLines] = useState<Line[]>(() => initial?.items.map(fromSaved) ?? preset.map(fromCatalog));
  const [notes, setNotes] = useState(initial?.order.notes ?? "");
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<Toast>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const supplier = lines[0] ? { name: lines[0].supplierName, phone: lines[0].supplierPhone, gstin: lines[0].supplierGstin } : null;
  const orderSupplier = lines[0]?.supplierName ?? "";

  const show = useCallback((t: Toast) => {
    clearTimeout(toastTimer.current);
    setToast(t);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const linesRef = useRef(lines);
  useEffect(() => {
    linesRef.current = lines;
  }, [lines]);

  /** Adds article sizes to the order; refuses ones from another supplier than the order's. */
  const addSizes = useCallback(
    (sizes: ArticleSize[]) => {
      const current = linesRef.current;
      const orderSupplier = current[0]?.supplierName;
      const other = orderSupplier ? sizes.find((z) => norm(z.supplierName) !== norm(orderSupplier)) : undefined;
      if (other) {
        show({ tone: "bad", text: `${other.articleCode} is from ${other.supplierName}. This order is for ${orderSupplier}. Save this order first, then start a new one.` });
        return;
      }
      const fresh = sizes.filter((z) => !current.some((l) => l.sizeId === z.id));
      const repeat = sizes.filter((z) => current.some((l) => l.sizeId === z.id));
      setLines((ls) => [...fresh.map(fromCatalog), ...ls.map((l) => (repeat.some((z) => z.id === l.sizeId) ? { ...l, sets: l.sets + 1 } : l))]);
      const first = sizes[0];
      if (first) show({ tone: "ok", text: `Added ${first.articleCode}: ${sizes.map((z) => z.size).join(", ")} at 1 set (${SET_PCS} pcs) each` });
    },
    [show]
  );

  function onTagSaved(saved: SavedTag) {
    setCatalog((c) => mergeCatalog(c, saved.sizes));
    addSizes(saved.sizes);
  }

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = orderSupplier ? catalog.filter((z) => norm(z.supplierName) === norm(orderSupplier)) : catalog;
    const list = q ? pool.filter((z) => `${z.articleCode} ${z.brand} ${z.supplierName} ${z.size}`.toLowerCase().includes(q)) : pool;
    return list.slice(0, 8);
  }, [catalog, query, orderSupplier]);

  function patch(k: string, p: Partial<Line>) {
    setLines((ls) => ls.map((l) => (l.key === k ? { ...l, ...p } : l)));
  }

  function setSets(k: string, sets: number) {
    patch(k, { sets: Math.max(1, Math.min(9999, Math.round(sets) || 1)) });
  }

  const totals = lines.reduce(
    (t, l) => {
      const pieces = l.sets * SET_PCS;
      return { sets: t.sets + l.sets, pieces: t.pieces + pieces, amount: t.amount + lineMoney({ pieces, rate: Number(l.rate) || 0 }).gross };
    },
    { sets: 0, pieces: 0, amount: 0 }
  );
  const missingSell = lines.filter((l) => !(Number(l.sellRate) > 0)).length;

  async function save() {
    setError(null);
    if (lines.length === 0) return setError("Scan a tag to add an item.");
    setSaving(true);
    try {
      const res = await fetch(initial ? `/api/orders/${initial.order.id}` : "/api/orders", {
        method: initial ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes,
          lines: [...lines].reverse().map((l) => ({ sizeId: l.sizeId, sets: l.sets, rate: Number(l.rate) || 0, sellRate: Number(l.sellRate) || 0 })),
        }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error ?? "Could not save this order.");
      router.push(`/orders/${data.orderId}${initial ? "" : "?new=1"}`);
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
            <p className={`rise mt-3 flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold ${toast.tone === "ok" ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"}`}>
              {toast.tone === "ok" ? <CheckCircle2 size={18} className="mt-px shrink-0" /> : <XCircle size={18} className="mt-px shrink-0" />}
              {toast.text}
            </p>
          )}
        </section>

        <section className="card p-4">
          <h2 className="font-bold">Already saved? Pick it</h2>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" size={18} />
            <input className="field pl-10" placeholder="Article code or brand" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          {results.length === 0 ? (
            <p className="mt-3 text-sm text-muted">{catalog.length === 0 ? "Scanned articles show up here to reuse." : "No match."}</p>
          ) : (
            <ul className="mt-2 divide-y divide-line">
              {results.map((z) => (
                <li key={z.id}>
                  <button type="button" onClick={() => addSizes([z])} className="flex w-full items-center gap-3 py-2.5 text-left">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">
                        {z.articleCode} <span className="text-accent">· {z.size}</span>
                      </p>
                      <p className="truncate text-sm text-muted">
                        {formatINR(z.rate)}/pc · {z.supplierName}
                      </p>
                    </div>
                    <span className="btn btn-soft btn-sm">
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
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Order goes to</p>
          {supplier ? (
            <>
              <p className="mt-1 text-lg font-extrabold">{supplier.name}</p>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                {supplier.phone && (
                  <span className="inline-flex items-center gap-1 tnum">
                    <Phone size={13} /> {supplier.phone}
                  </span>
                )}
                <span>{supplier.gstin ? `GSTIN ${supplier.gstin}` : "GST no. not on tag"}</span>
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted">The supplier is filled in from the first tag you scan.</p>
          )}
        </section>

        <section className="card p-4 md:p-5">
          <h2 className="font-bold">
            Items{lines.length > 0 && <span className="ml-1.5 font-semibold text-muted">{lines.length}</span>}
          </h2>

          {lines.length === 0 ? (
            <div className="py-10 text-center">
              <PackagePlus className="mx-auto text-line" size={40} strokeWidth={1.5} />
              <p className="mt-2 text-sm text-muted">Scan a tag and its size ranges appear here.</p>
            </div>
          ) : (
            <ul className="mt-3 space-y-3">
              {lines.map((l) => {
                const pieces = l.sets * SET_PCS;
                const m = lineMoney({ pieces, rate: Number(l.rate) || 0 });
                const noSell = !(Number(l.sellRate) > 0);
                return (
                  <li key={l.key} className="rise rounded-xl border border-line p-3">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-extrabold">
                          {l.articleCode} <span className="font-bold text-accent">· {l.size}</span>
                        </p>
                        {l.brand && <p className="truncate text-sm text-muted">{l.brand}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
                        className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger"
                        aria-label={`Remove ${l.articleCode} ${l.size}`}
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Stepper value={l.sets} onChange={(v) => setSets(l.key, v)} label="sets" min={1} />
                        <span className="text-sm text-muted">
                          set{l.sets === 1 ? "" : "s"} = <b className="text-foreground tnum">{pieces} pcs</b>
                        </span>
                      </div>
                      <p className="font-extrabold tnum">{formatINR(m.gross)}</p>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Money label="Supplier rate / pc" value={l.rate} onChange={(v) => patch(l.key, { rate: v })} />
                      <Money label="Your selling price / pc" value={l.sellRate} onChange={(v) => patch(l.key, { sellRate: v })} highlight={noSell} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="card p-4 md:p-5">
          <label className="label" htmlFor="notes">
            Note for the supplier <span className="font-normal">(optional)</span>
          </label>
          <input id="notes" className="field" placeholder="e.g. Deliver by Friday" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </section>

        {missingSell > 0 && (
          <p className="rounded-xl bg-warn-soft px-3 py-2.5 text-sm font-medium text-warn">
            {missingSell} item{missingSell === 1 ? " has" : "s have"} no selling price yet. You can add it now, later in Stock, or type it on the bill.
          </p>
        )}
        {error && <p className="alert-error">{error}</p>}

        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:static md:rounded-[1.1rem] md:border md:px-5 md:py-4 md:shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-lg font-extrabold tnum">
                {totals.sets} sets · {totals.pieces} pcs
              </p>
              <p className="text-sm text-muted tnum">{formatINR(totals.amount)} at supplier rate</p>
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
