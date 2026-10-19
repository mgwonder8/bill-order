"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Loader2, Plus, Receipt, Search, Trash2 } from "lucide-react";
import { formatINR, lineMoney } from "@/lib/money";
import { SET_PCS } from "@/lib/sets";
import type { ArticleSize, Customer, CustomerOrder, CustomerOrderItem } from "@/lib/types";
import { TagTray } from "@/components/tag-tray";
import { CustomerPicker, type CustomerDraft } from "@/components/customer-picker";
import { Stepper } from "@/components/inputs";

type Line = {
  key: string;
  sizeId: string;
  articleCode: string;
  brand: string;
  supplierName: string;
  size: string;
  sizes: string;
  pcsPerSet: number;
  sets: number;
  pieces: string;
  rate: string;
};

let seq = 0;
const key = () => `c${seq++}`;
const price = (z: { sellRate: number; rate: number }) => String(z.sellRate > 0 ? z.sellRate : z.rate > 0 ? z.rate : "");

function fromSize(z: ArticleSize): Line {
  const pcs = z.pcsPerSet || SET_PCS;
  return { key: key(), sizeId: z.id, articleCode: z.articleCode, brand: z.brand, supplierName: z.supplierName, size: z.size, sizes: z.sizes, pcsPerSet: pcs, sets: 1, pieces: String(pcs), rate: price(z) };
}

function fromSaved(i: CustomerOrderItem): Line {
  return { key: key(), sizeId: i.sizeId, articleCode: i.articleCode, brand: i.brand, supplierName: i.supplierName, size: i.size, sizes: i.sizes, pcsPerSet: i.pcsPerSet || SET_PCS, sets: i.sets, pieces: String(i.pieces), rate: String(i.rate || "") };
}

/** Customer order form: scan many tags, tick what the customer wants, adjust sets, pieces and price, save or bill. */
export function OrderForm({
  catalog: savedCatalog,
  customers,
  initial,
}: {
  catalog: ArticleSize[];
  customers: Customer[];
  initial?: { order: CustomerOrder; items: CustomerOrderItem[] };
}) {
  const router = useRouter();
  const [catalog, setCatalog] = useState(savedCatalog);
  const [lines, setLines] = useState<Line[]>(() => initial?.items.map(fromSaved) ?? []);
  const [customer, setCustomer] = useState<CustomerDraft>({
    name: initial && initial.order.customerName !== "Walk-in customer" ? initial.order.customerName : "",
    phone: initial?.order.customerPhone ?? "",
    gstin: initial?.order.customerGstin ?? "",
    address: initial?.order.customerAddress ?? "",
  });
  const [notes, setNotes] = useState(initial?.order.notes ?? "");
  const [query, setQuery] = useState("");
  const [finding, setFinding] = useState(false);
  const [saving, setSaving] = useState<null | "save" | "bill">(null);
  const [error, setError] = useState<string | null>(null);

  function addSizes(sizes: ArticleSize[]) {
    setCatalog((c) => [...sizes, ...c.filter((z) => !sizes.some((s) => s.id === z.id))]);
    setLines((ls) => {
      const next = [...ls];
      for (const z of sizes) {
        const at = next.findIndex((l) => l.sizeId === z.id);
        if (at >= 0) {
          const sets = next[at].sets + 1;
          next[at] = { ...next[at], sets, pieces: String(sets * next[at].pcsPerSet) };
        } else next.push(fromSize(z));
      }
      return next;
    });
    setError(null);
  }

  function patch(k: string, p: Partial<Line>) {
    setLines((ls) => ls.map((l) => (l.key === k ? { ...l, ...p } : l)));
  }

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return catalog.filter((z) => `${z.articleCode} ${z.brand} ${z.supplierName} ${z.size}`.toLowerCase().includes(q)).slice(0, 10);
  }, [catalog, query]);

  const groups = useMemo(() => {
    const map = new Map<string, Line[]>();
    for (const l of lines) map.set(`${l.articleCode}|${l.supplierName}`, [...(map.get(`${l.articleCode}|${l.supplierName}`) ?? []), l]);
    return [...map.values()];
  }, [lines]);

  const totals = lines.reduce(
    (t, l) => {
      const pieces = Number(l.pieces) || 0;
      return { sets: t.sets + l.sets, pieces: t.pieces + pieces, amount: t.amount + lineMoney({ pieces, rate: Number(l.rate) || 0 }).gross };
    },
    { sets: 0, pieces: 0, amount: 0 }
  );

  async function save(then: "save" | "bill") {
    setError(null);
    if (lines.length === 0) return setError("Scan a tag or find an article to add items.");
    const noQty = lines.find((l) => !(Number(l.pieces) > 0));
    if (noQty) return setError(`Enter the pieces for ${noQty.articleCode} (${noQty.size}).`);
    setSaving(then);
    try {
      const res = await fetch(initial ? `/api/customer-orders/${initial.order.id}` : "/api/customer-orders", {
        method: initial ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customer.name,
          customerPhone: customer.phone,
          customerGstin: customer.gstin,
          customerAddress: customer.address,
          notes,
          lines: lines.map((l) => ({ sizeId: l.sizeId, sets: l.sets, pieces: Number(l.pieces) || 0, rate: Number(l.rate) || 0 })),
        }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error ?? "Could not save this order.");
      router.push(then === "bill" ? `/bills/new?order=${data.orderId}` : `/customer-orders/${data.orderId}${initial ? "" : "?new=1"}`);
      router.refresh();
    } catch {
      setError("Could not reach the server while saving.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-5 pb-32 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-start lg:pb-0">
      <div className="space-y-5 lg:sticky lg:top-6">
        <section className="card p-4">
          <TagTray catalog={catalog} onAdd={addSizes} />
          <button type="button" onClick={() => setFinding((f) => !f)} className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-accent">
            <Search size={15} /> Find a saved article instead
          </button>
          {finding && (
            <div className="rise mt-2">
              <input className="field" placeholder="Article code, brand or supplier" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
              {query.trim() && results.length === 0 && <p className="mt-2 text-sm text-muted">No saved article matches. Scan its tag to add it.</p>}
              <ul className="mt-1 divide-y divide-line">
                {results.map((z) => (
                  <li key={z.id}>
                    <button type="button" onClick={() => addSizes([z])} className="flex w-full items-center gap-3 py-2.5 text-left">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-bold">
                          {z.articleCode} <span className="text-accent">· {z.size}</span>
                        </span>
                        <span className="block truncate text-xs text-muted">
                          {formatINR(Number(price(z)) || 0)}/pc · {z.supplierName}
                        </span>
                      </span>
                      <span className="btn btn-soft btn-sm">
                        <Plus size={15} /> Add
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      <div className="space-y-5">
        <section className="card p-4 md:p-5">
          <h2 className="mb-3 font-bold">Customer</h2>
          <CustomerPicker customers={customers} value={customer} onChange={setCustomer} />
        </section>

        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line p-4 md:px-5">
            <h2 className="font-bold">
              Articles{groups.length > 0 && <span className="ml-1.5 font-semibold text-muted">{groups.length}</span>}
            </h2>
            {lines.length > 0 && <p className="text-sm font-semibold text-muted tnum">{lines.length} size line{lines.length === 1 ? "" : "s"}</p>}
          </div>

          {groups.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <ClipboardList className="mx-auto text-line" size={40} strokeWidth={1.5} />
              <p className="mt-2 text-sm text-muted">Scan the tags the customer wants. Tick them and add.</p>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {groups.map((g) => (
                <li key={g[0].key} className="rise p-4 md:px-5">
                  <div className="mb-2">
                    <p className="font-extrabold">{g[0].articleCode}</p>
                    <p className="truncate text-xs text-muted">{[g[0].brand, g[0].supplierName].filter(Boolean).join(" · ")}</p>
                  </div>
                  <div className="space-y-2.5">
                    {g.map((l) => {
                      const pieces = Number(l.pieces) || 0;
                      const amount = lineMoney({ pieces, rate: Number(l.rate) || 0 }).gross;
                      return (
                        <div key={l.key} className="rounded-xl border border-line p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-bold">
                              <span className="text-accent">{l.size}</span>
                              {l.sizes && l.sizes !== l.size && <span className="ml-1.5 text-xs font-medium text-muted">({l.sizes.replaceAll("/", ", ")})</span>}
                            </p>
                            <button type="button" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger" aria-label={`Remove ${l.articleCode} ${l.size}`}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                          <div className="mt-2 grid grid-cols-[auto_1fr_1fr] items-end gap-2">
                            <div>
                              <span className="mb-1 block text-xs font-semibold text-muted">Sets</span>
                              <Stepper value={l.sets} min={0} label="sets" onChange={(v) => { const sets = Math.max(0, Math.round(v) || 0); patch(l.key, { sets, pieces: String(sets * l.pcsPerSet) }); }} />
                            </div>
                            <label className="block min-w-0">
                              <span className="mb-1 block text-xs font-semibold text-muted">Pieces</span>
                              <input className="field h-11 min-h-0 text-center font-bold tnum" type="number" inputMode="numeric" min="0" value={l.pieces} onChange={(e) => patch(l.key, { pieces: e.target.value })} />
                            </label>
                            <label className="block min-w-0">
                              <span className={`mb-1 block text-xs font-semibold ${Number(l.rate) > 0 ? "text-muted" : "text-warn"}`}>Price / pc</span>
                              <span className="relative block">
                                <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm font-semibold text-muted">₹</span>
                                <input className="field h-11 min-h-0 pl-6 tnum" type="number" inputMode="decimal" min="0" placeholder="0" value={l.rate} onChange={(e) => patch(l.key, { rate: e.target.value })} />
                              </span>
                            </label>
                          </div>
                          <p className="mt-2 text-right text-sm text-muted tnum">
                            {pieces} pcs × {formatINR(Number(l.rate) || 0)} = <b className="text-foreground">{formatINR(amount)}</b>
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-4 md:p-5">
          <label className="label" htmlFor="notes">
            Note <span className="font-normal">(optional)</span>
          </label>
          <input id="notes" className="field" placeholder="e.g. Deliver Monday" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </section>

        {error && <p className="alert-error">{error}</p>}

        <div className="no-print fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:static lg:rounded-[1.1rem] lg:border lg:px-5 lg:py-4 lg:shadow-sm">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <p className="font-extrabold tnum">
              {totals.sets} sets · {totals.pieces} pcs
            </p>
            <p className="text-lg font-extrabold tnum">{formatINR(totals.amount)}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => save("save")} disabled={saving !== null || lines.length === 0} className="btn btn-outline">
              {saving === "save" && <Loader2 className="animate-spin" size={18} />}
              {initial ? "Save changes" : "Save order"}
            </button>
            <button type="button" onClick={() => save("bill")} disabled={saving !== null || lines.length === 0} className="btn btn-primary">
              {saving === "bill" ? <Loader2 className="animate-spin" size={18} /> : <Receipt size={18} />}
              Save & bill
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
