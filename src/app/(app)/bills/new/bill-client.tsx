"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2, Percent } from "lucide-react";
import { billMoney, formatINR, lineMoney } from "@/lib/money";
import type { Order, OrderItem } from "@/lib/types";

export function BillClient({ order, items }: { order: Order; items: OrderItem[] }) {
  const router = useRouter();
  const [customerName, setCustomerName] = useState(order.customerName);
  const [customerPhone, setCustomerPhone] = useState(order.customerPhone);
  const [customerGstin, setCustomerGstin] = useState(order.customerGstin);
  const [customerAddress, setCustomerAddress] = useState(order.customerAddress);
  const [hsn, setHsn] = useState("6109");
  const [notes, setNotes] = useState(order.notes);
  const [discounts, setDiscounts] = useState<Record<string, string>>({});
  const [allPct, setAllPct] = useState("");
  const [more, setMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pct = (id: string) => Math.min(100, Math.max(0, Number(discounts[id]) || 0));
  const totals = billMoney(items.map((i) => ({ ...i, discountPct: pct(i.id) })));

  function applyAll(v: string) {
    setAllPct(v);
    setDiscounts(Object.fromEntries(items.map((i) => [i.id, v])));
  }

  async function save() {
    setError(null);
    if (!customerName.trim()) return setError("Enter the customer name for the bill.");
    setSaving(true);
    try {
      const res = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          customerName,
          customerPhone,
          customerGstin,
          customerAddress,
          hsn,
          notes,
          discounts: Object.fromEntries(items.map((i) => [i.id, pct(i.id)])),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not make this bill.");
        return;
      }
      router.push(`/bills/${data.billId}?new=1`);
      router.refresh();
    } catch {
      setError("Could not reach the server while saving.");
    } finally {
      setSaving(false);
    }
  }

  const confirm = (
    <button type="button" onClick={save} disabled={saving} className="btn btn-primary btn-lg w-full">
      {saving && <Loader2 className="animate-spin" size={18} />}
      Confirm & make bill
    </button>
  );

  return (
    <div className="grid grid-cols-1 gap-5 pb-24 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:pb-0">
      <div className="space-y-5">
        <section className="card p-4 md:p-5">
          <h2 className="font-bold">Customer</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field id="cust" label="Name / shop" value={customerName} onChange={setCustomerName} />
            <Field id="phone" label="Phone (WhatsApp)" value={customerPhone} onChange={setCustomerPhone} inputMode="tel" />
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

        <section className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4 md:px-5">
            <h2 className="font-bold">Items</h2>
            <label className="flex items-center gap-2 text-sm font-semibold text-muted" htmlFor="all">
              Discount for all
              <PctInput id="all" value={allPct} onChange={applyAll} />
            </label>
          </div>
          <ul className="divide-y divide-line">
            {items.map((i) => {
              const m = lineMoney({ ...i, discountPct: pct(i.id) });
              return (
                <li key={i.id} className="flex flex-wrap items-center gap-3 p-4 md:px-5">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">
                      {i.articleCode} <span className="text-accent">· {i.size}</span>
                    </p>
                    <p className="text-sm text-muted tnum">
                      {i.sets} set{i.sets === 1 ? "" : "s"} · {m.pieces} pcs × {formatINR(i.rate)}
                    </p>
                  </div>
                  <PctInput id={`d-${i.id}`} value={discounts[i.id] ?? ""} onChange={(v) => setDiscounts((d) => ({ ...d, [i.id]: v }))} label={`Discount for ${i.articleCode} ${i.size}`} />
                  <div className="w-28 text-right">
                    <p className="font-bold tnum">{formatINR(m.taxable)}</p>
                    {m.discountAmount > 0 && <p className="text-xs text-muted line-through tnum">{formatINR(m.gross)}</p>}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <aside className="card p-5 lg:sticky lg:top-6">
        <h2 className="font-bold">Bill total</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <Row label={`${totals.totalSets} sets · ${totals.totalPieces} pcs`} value={formatINR(totals.grossAmount)} />
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

      <div className="no-print fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
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
      <input
        id={id}
        aria-label={label}
        className="field h-11 min-h-0 w-20 pr-7 text-right tnum"
        type="number"
        inputMode="decimal"
        min="0"
        max="100"
        placeholder="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <Percent size={14} className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-muted" />
    </span>
  );
}

function Field({ id, label, value, onChange, inputMode }: { id: string; label: string; value: string; onChange: (v: string) => void; inputMode?: "tel" }) {
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <input id={id} className="field" value={value} inputMode={inputMode} onChange={(e) => onChange(e.target.value)} />
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
