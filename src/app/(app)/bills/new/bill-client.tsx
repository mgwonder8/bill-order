"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Camera, ChevronDown, Loader2, Percent, Receipt, Search, Trash2, X } from "lucide-react";
import { billMoney, formatINR, lineMoney } from "@/lib/money";
import { SET_PCS, qtyLabel } from "@/lib/sets";
import type { Customer, StockItem, TagExtract } from "@/lib/types";
import { Money, Stepper } from "@/components/inputs";

type Line = {
  key: string;
  item: StockItem;
  sets: number;
  loose: number;
  rate: string;
  discount: string;
};

let seq = 0;
const key = () => `b${seq++}`;
const code = (v: string) => v.toUpperCase().replace(/[^A-Z0-9]/g, "");
const digits = (v: string) => v.replace(/\D/g, "");
const phoneKey = (v: string) => v.replace(/\D/g, "").slice(-10);

/** Stock items that match an article code read off a tag: exact code first, then the same number. */
function matchStock(stock: StockItem[], designNo: string): StockItem[] {
  const want = code(designNo);
  if (!want) return [];
  const exact = stock.filter((z) => code(z.articleCode) === want);
  if (exact.length) return exact;
  const num = digits(want);
  return num.length >= 3 ? stock.filter((z) => digits(z.articleCode) === num) : [];
}

export function BillClient({ stock, customers }: { stock: StockItem[]; customers: Customer[] }) {
  const router = useRouter();
  const camera = useRef<HTMLInputElement>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [query, setQuery] = useState("");
  const [picking, setPicking] = useState(false);
  const [reading, setReading] = useState(false);
  const [matches, setMatches] = useState<{ title: string; items: StockItem[] } | null>(null);
  const [scanNote, setScanNote] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerGstin, setCustomerGstin] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [hsn, setHsn] = useState("6109");
  const [notes, setNotes] = useState("");
  const [allPct, setAllPct] = useState("");
  const [more, setMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function add(item: StockItem) {
    setLines((ls) =>
      ls.some((l) => l.item.id === item.id)
        ? ls.map((l) => (l.item.id === item.id ? { ...l, sets: l.sets + 1 } : l))
        : [{ key: key(), item, sets: 1, loose: 0, rate: item.sellRate > 0 ? String(item.sellRate) : "", discount: allPct }, ...ls]
    );
    setMatches(null);
    setScanNote(null);
  }

  function patch(k: string, p: Partial<Line>) {
    setLines((ls) => ls.map((l) => (l.key === k ? { ...l, ...p } : l)));
  }

  async function scan(file: File | undefined) {
    if (!file) return;
    setReading(true);
    setMatches(null);
    setScanNote(null);
    try {
      const body = new FormData();
      body.append("image", file);
      body.append("store", "0");
      const res = await fetch("/api/scan", { method: "POST", body });
      const data = await res.json();
      const x = data.extract as TagExtract | undefined;
      if (!res.ok || !x?.designNo) {
        setScanNote(data.error ?? "Could not read the article code. Try again or pick from stock.");
        return;
      }
      const found = matchStock(stock, x.designNo);
      if (found.length === 0) {
        setScanNote(`${x.designNo} is not in stock yet. Order it from the supplier first, or pick from stock.`);
      } else if (found.length === 1) {
        add(found[0]);
      } else {
        setMatches({ title: `${found[0].articleCode}: which size range?`, items: found });
      }
    } catch {
      setScanNote("Could not reach the server. Check your internet and try again.");
    } finally {
      setReading(false);
      if (camera.current) camera.current.value = "";
    }
  }

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? stock.filter((z) => `${z.articleCode} ${z.brand} ${z.supplierName} ${z.size}`.toLowerCase().includes(q)) : stock;
    return [...list].sort((a, b) => Number(b.inStock > 0) - Number(a.inStock > 0)).slice(0, 12);
  }, [stock, query]);

  function pickCustomer(name: string) {
    setCustomerName(name);
    const c = customers.find((x) => x.name.toLowerCase() === name.trim().toLowerCase());
    if (c) {
      setCustomerPhone((v) => v || c.phone);
      setCustomerGstin((v) => v || c.gstin);
      setCustomerAddress((v) => v || c.address);
    }
  }

  function pickPhone(phone: string) {
    setCustomerPhone(phone);
    const k = phoneKey(phone);
    const c = k.length === 10 ? customers.find((x) => phoneKey(x.phone) === k) : undefined;
    if (c) {
      setCustomerName((v) => v || c.name);
      setCustomerGstin((v) => v || c.gstin);
      setCustomerAddress((v) => v || c.address);
    }
  }

  function applyAll(v: string) {
    setAllPct(v);
    setLines((ls) => ls.map((l) => ({ ...l, discount: v })));
  }

  const priced = lines.map((l) => ({ ...l, pieces: l.sets * SET_PCS + l.loose, rateN: Number(l.rate) || 0, pct: Math.min(100, Math.max(0, Number(l.discount) || 0)) }));
  const totals = billMoney(priced.map((l) => ({ sets: l.sets, pieces: l.pieces, rate: l.rateN, discountPct: l.pct })));

  async function save() {
    setError(null);
    if (lines.length === 0) return setError("Scan a tag or pick an item from stock.");
    const noQty = priced.find((l) => l.pieces <= 0);
    if (noQty) return setError(`Enter a quantity for ${noQty.item.articleCode} (${noQty.item.size}).`);
    const noRate = priced.find((l) => l.rateN <= 0);
    if (noRate) return setError(`Enter the price for ${noRate.item.articleCode} (${noRate.item.size}).`);
    if (!customerName.trim()) return setError("Enter the customer name.");
    setSaving(true);
    try {
      const res = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerPhone,
          customerGstin,
          customerAddress,
          hsn,
          notes,
          lines: [...priced].reverse().map((l) => ({ sizeId: l.item.id, sets: l.sets, loosePieces: l.loose, rate: l.rateN, discountPct: l.pct })),
        }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error ?? "Could not make this bill.");
      router.push(`/bills/${data.billId}?new=1`);
      router.refresh();
    } catch {
      setError("Could not reach the server while saving.");
    } finally {
      setSaving(false);
    }
  }

  const confirm = (
    <button type="button" onClick={save} disabled={saving || lines.length === 0} className="btn btn-primary btn-lg w-full">
      {saving && <Loader2 className="animate-spin" size={18} />}
      Make bill
    </button>
  );

  return (
    <div className="grid grid-cols-1 gap-5 pb-24 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:pb-0">
      <div className="space-y-5">
        <section className="card p-4 md:p-5">
          <input ref={camera} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => scan(e.target.files?.[0])} />
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => camera.current?.click()} disabled={reading} className="btn btn-primary">
              {reading ? <Loader2 className="animate-spin" size={18} /> : <Camera size={18} />}
              {reading ? "Reading…" : "Scan tag"}
            </button>
            <button type="button" onClick={() => setPicking((p) => !p)} className={`btn ${picking ? "btn-soft" : "btn-outline"}`}>
              <Search size={18} /> Pick from stock
            </button>
          </div>

          {scanNote && (
            <p className="rise mt-3 flex items-start gap-2 rounded-xl bg-warn-soft px-3 py-2.5 text-sm font-medium text-warn">
              <AlertTriangle size={17} className="mt-px shrink-0" />
              <span>
                {scanNote}{" "}
                {scanNote.includes("not in stock") && (
                  <Link href="/orders/new" className="font-bold underline">
                    Order from supplier
                  </Link>
                )}
              </span>
            </p>
          )}

          {matches && (
            <div className="rise mt-3 rounded-xl border border-accent/30 bg-accent-soft/50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-bold">{matches.title}</p>
                <button type="button" onClick={() => setMatches(null)} className="text-muted" aria-label="Close">
                  <X size={18} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {matches.items.map((z) => (
                  <button key={z.id} type="button" onClick={() => add(z)} className="rounded-xl border border-line bg-surface p-3 text-left hover:border-accent">
                    <p className="font-extrabold">{z.size}</p>
                    <p className={`text-xs font-semibold ${z.inStock > 0 ? "text-ok" : "text-danger"}`}>{z.inStock > 0 ? `${qtyLabel(z.inStock)} in stock` : "Out of stock"}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {picking && (
            <div className="rise mt-3">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" size={18} />
                <input className="field pl-10" placeholder="Article code, brand or supplier" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
              </div>
              {stock.length === 0 ? (
                <p className="mt-3 text-sm text-muted">
                  Nothing in stock yet.{" "}
                  <Link href="/orders/new" className="font-bold text-accent">
                    Order from a supplier
                  </Link>
                </p>
              ) : (
                <ul className="mt-2 max-h-80 divide-y divide-line overflow-y-auto">
                  {results.map((z) => (
                    <li key={z.id}>
                      <button type="button" onClick={() => add(z)} className="flex w-full items-center gap-3 py-2.5 text-left">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold">
                            {z.articleCode} <span className="text-accent">· {z.size}</span>
                          </p>
                          <p className="truncate text-xs text-muted">
                            {z.sellRate > 0 ? `${formatINR(z.sellRate)}/pc` : "No selling price"} · {z.supplierName}
                          </p>
                        </div>
                        <span className={`text-xs font-bold whitespace-nowrap ${z.inStock > 0 ? "text-ok" : "text-danger"}`}>{z.inStock > 0 ? qtyLabel(z.inStock) : "Out"}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>

        <section className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4 md:px-5">
            <h2 className="font-bold">
              Items{lines.length > 0 && <span className="ml-1.5 font-semibold text-muted">{lines.length}</span>}
            </h2>
            {lines.length > 1 && (
              <label className="flex items-center gap-2 text-sm font-semibold text-muted" htmlFor="all">
                Discount for all
                <PctInput id="all" value={allPct} onChange={applyAll} />
              </label>
            )}
          </div>
          {lines.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <Receipt className="mx-auto text-line" size={40} strokeWidth={1.5} />
              <p className="mt-2 text-sm text-muted">Scan the tag of what the customer is buying.</p>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {priced.map((l) => {
                const m = lineMoney({ pieces: l.pieces, rate: l.rateN, discountPct: l.pct });
                const short = l.pieces > l.item.inStock;
                return (
                  <li key={l.key} className="rise p-4 md:px-5">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-extrabold">
                          {l.item.articleCode} <span className="font-bold text-accent">· {l.item.size}</span>
                        </p>
                        <p className="truncate text-xs text-muted">{l.item.supplierName}</p>
                      </div>
                      <button type="button" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger" aria-label="Remove item">
                        <Trash2 size={17} />
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap items-end gap-3">
                      <div>
                        <p className="mb-1 text-xs font-semibold text-muted">Sets (24 pcs)</p>
                        <Stepper value={l.sets} onChange={(v) => patch(l.key, { sets: Math.max(0, Math.round(v) || 0) })} label="sets" />
                      </div>
                      <div>
                        <p className="mb-1 text-xs font-semibold text-muted">Loose pieces</p>
                        <Stepper value={l.loose} onChange={(v) => patch(l.key, { loose: Math.max(0, Math.round(v) || 0) })} label="pieces" />
                      </div>
                      <p className="pb-2.5 text-sm text-muted">
                        = <b className="text-foreground tnum">{l.pieces} pcs</b>
                      </p>
                    </div>

                    {short && (
                      <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-warn-soft px-2.5 py-1 text-xs font-bold text-warn">
                        <AlertTriangle size={14} /> {l.item.inStock > 0 ? `Only ${qtyLabel(l.item.inStock)} in stock` : "Out of stock"}. You can still bill it.
                      </p>
                    )}

                    <div className="mt-3 grid grid-cols-[1fr_auto] items-end gap-3">
                      <Money label="Price / pc" value={l.rate} onChange={(v) => patch(l.key, { rate: v })} highlight={l.rateN <= 0} />
                      <label className="block">
                        <span className="mb-1 block text-xs font-semibold text-muted">Discount</span>
                        <PctInput id={`d-${l.key}`} value={l.discount} onChange={(v) => patch(l.key, { discount: v })} label={`Discount for ${l.item.articleCode}`} />
                      </label>
                    </div>
                    <div className="mt-2 flex items-baseline justify-end gap-2">
                      {m.discountAmount > 0 && <span className="text-xs text-muted line-through tnum">{formatINR(m.gross)}</span>}
                      <span className="font-extrabold tnum">{formatINR(m.taxable)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="card p-4 md:p-5">
          <h2 className="font-bold">Customer</h2>
          <datalist id="customer-names">
            {customers.map((c) => (
              <option key={c.id} value={c.name} />
            ))}
          </datalist>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field id="cust" label="Name / shop" value={customerName} onChange={pickCustomer} list="customer-names" />
            <Field id="phone" label="Phone (WhatsApp)" value={customerPhone} onChange={pickPhone} inputMode="tel" />
          </div>
          <button type="button" onClick={() => setMore((m) => !m)} className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-accent">
            <ChevronDown size={16} className={more ? "rotate-180" : ""} /> {more ? "Hide" : "GST no., address, HSN & note"}
          </button>
          {more && (
            <div className="rise mt-3 grid gap-3 sm:grid-cols-2">
              <Field id="gstin" label="Customer GST no." value={customerGstin} onChange={(v) => setCustomerGstin(v.toUpperCase())} />
              <Field id="addr" label="Address" value={customerAddress} onChange={setCustomerAddress} />
              <Field id="hsn" label="HSN code" value={hsn} onChange={setHsn} />
              <Field id="notes" label="Note on bill" value={notes} onChange={setNotes} />
            </div>
          )}
        </section>
      </div>

      <aside className="card p-5 lg:sticky lg:top-6">
        <h2 className="font-bold">Bill total</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <Row label={qtyLabel(totals.totalPieces)} value={formatINR(totals.grossAmount)} />
          {totals.discountAmount > 0 && <Row label="Discount" value={`− ${formatINR(totals.discountAmount)}`} />}
          <Row label="Taxable value" value={formatINR(totals.taxableAmount)} />
          <Row label={`CGST ${totals.cgstRate}%`} value={formatINR(totals.cgstAmount)} />
          <Row label={`SGST ${totals.sgstRate}%`} value={formatINR(totals.sgstAmount)} />
          {totals.roundOff !== 0 && <Row label="Round off" value={formatINR(totals.roundOff)} />}
          <div className="flex items-center justify-between rounded-xl bg-accent-soft px-3 py-2.5 text-lg font-extrabold text-accent">
            <dt>Total</dt>
            <dd className="tnum">{formatINR(totals.total)}</dd>
          </div>
        </dl>
        {error && <p className="alert-error mt-3">{error}</p>}
        <div className="mt-4 hidden lg:block">{confirm}</div>
      </aside>

      <div className="no-print fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
        {error && <p className="alert-error mb-2 text-sm">{error}</p>}
        <div className="flex items-center gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-muted">Total with GST</p>
            <p className="text-xl font-extrabold tnum">{formatINR(totals.total)}</p>
          </div>
          <div className="flex-1">{confirm}</div>
        </div>
      </div>
    </div>
  );
}

function PctInput({ id, value, onChange, label }: { id: string; value: string; onChange: (v: string) => void; label?: string }) {
  return (
    <span className="relative inline-block">
      <input id={id} aria-label={label} className="field h-11 min-h-0 w-20 pr-7 text-right tnum" type="number" inputMode="decimal" min="0" max="100" placeholder="0" value={value} onChange={(e) => onChange(e.target.value)} />
      <Percent size={14} className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-muted" />
    </span>
  );
}

function Field({ id, label, value, onChange, inputMode, list }: { id: string; label: string; value: string; onChange: (v: string) => void; inputMode?: "tel"; list?: string }) {
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <input id={id} className="field" value={value} inputMode={inputMode} list={list} autoComplete="off" onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-3">
      <dt className="text-muted">{label}</dt>
      <dd className="font-semibold tnum">{value}</dd>
    </div>
  );
}
