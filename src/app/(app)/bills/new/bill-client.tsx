"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, Loader2, Pencil, Percent } from "lucide-react";
import { billMoney, formatINR, lineMoney } from "@/lib/money";
import type { Customer, CustomerOrder, CustomerOrderItem, GstMode } from "@/lib/types";
import { CustomerPicker, type CustomerDraft } from "@/components/customer-picker";

/** Turns a saved customer order into a bill: customer, with or without GST, optional discount, confirm. */
export function BillClient({ order, items, customers }: { order: CustomerOrder; items: CustomerOrderItem[]; customers: Customer[] }) {
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerDraft>({
    name: order.customerName === "Walk-in customer" ? "" : order.customerName,
    phone: order.customerPhone,
    gstin: order.customerGstin,
    address: order.customerAddress,
  });
  const [gstMode, setGstMode] = useState<GstMode>("with");
  const [discounts, setDiscounts] = useState<Record<string, string>>({});
  const [allPct, setAllPct] = useState("");
  const [hsn, setHsn] = useState("6109");
  const [notes, setNotes] = useState(order.notes);
  const [more, setMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pct = (id: string) => Math.min(100, Math.max(0, Number(discounts[id]) || 0));
  const totals = billMoney(items.map((i) => ({ ...i, discountPct: pct(i.id) })), gstMode);

  function applyAll(v: string) {
    setAllPct(v);
    setDiscounts(Object.fromEntries(items.map((i) => [i.id, v])));
  }

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          customerName: customer.name,
          customerPhone: customer.phone,
          customerGstin: customer.gstin,
          customerAddress: customer.address,
          gstMode,
          hsn,
          notes,
          discounts: Object.fromEntries(items.map((i) => [i.id, pct(i.id)])),
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
    <button type="button" onClick={save} disabled={saving} className="btn btn-primary btn-lg w-full">
      {saving && <Loader2 className="animate-spin" size={18} />}
      Make bill
    </button>
  );

  return (
    <div className="grid grid-cols-1 gap-5 pb-28 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:pb-0">
      <div className="space-y-5">
        <section className="card p-4 md:p-5">
          <h2 className="mb-3 font-bold">Bill to</h2>
          <CustomerPicker customers={customers} value={customer} onChange={setCustomer} />
          <p className="mt-2 text-xs text-muted">Saved to this customer for next time. Leave empty for a walk-in.</p>
        </section>

        <section className="card p-4 md:p-5">
          <p className="mb-2 font-bold">GST on this bill</p>
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-background p-1.5">
            {(
              [
                { mode: "with", title: "With GST", note: "+5% (CGST + SGST)" },
                { mode: "without", title: "Without GST", note: "No GST on the bill" },
              ] as const
            ).map((o) => (
              <button
                key={o.mode}
                type="button"
                onClick={() => setGstMode(o.mode)}
                className={`rounded-xl px-3 py-3 text-left transition ${gstMode === o.mode ? "bg-accent text-white shadow-sm" : "text-muted hover:bg-surface"}`}
              >
                <span className="block font-extrabold">{o.title}</span>
                <span className={`block text-xs ${gstMode === o.mode ? "text-white/80" : ""}`}>{o.note}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4 md:px-5">
            <div>
              <h2 className="font-bold">Items</h2>
              <p className="text-xs text-muted tnum">
                {order.orderNo} · {items.length} line{items.length === 1 ? "" : "s"}
              </p>
            </div>
            <Link href={`/customer-orders/${order.id}/edit`} className="btn btn-outline btn-sm">
              <Pencil size={15} /> Change items
            </Link>
          </div>
          <div className="flex items-center justify-end gap-2 border-b border-line px-4 py-2.5 text-sm font-semibold text-muted md:px-5">
            Discount for all <PctInput id="all" value={allPct} onChange={applyAll} />
          </div>
          <ul className="divide-y divide-line">
            {items.map((i) => {
              const m = lineMoney({ pieces: i.pieces, rate: i.rate, discountPct: pct(i.id) });
              return (
                <li key={i.id} className="flex flex-wrap items-center gap-3 p-4 md:px-5">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">
                      {i.articleCode} <span className="text-accent">· {i.size}</span>
                    </p>
                    <p className="text-sm text-muted tnum">
                      {i.sets} set{i.sets === 1 ? "" : "s"} · {i.pieces} pcs × {formatINR(i.rate)}
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
          <div className="border-t border-line p-4 md:px-5">
            <button type="button" onClick={() => setMore((m) => !m)} className="inline-flex items-center gap-1 text-sm font-bold text-accent">
              <ChevronDown size={16} className={more ? "rotate-180" : ""} /> HSN code & note
            </button>
            {more && (
              <div className="rise mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="hsn">
                    HSN code
                  </label>
                  <input id="hsn" className="field" value={hsn} onChange={(e) => setHsn(e.target.value)} />
                </div>
                <div>
                  <label className="label" htmlFor="notes">
                    Note on bill
                  </label>
                  <input id="notes" className="field" value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      <aside className="card p-5 lg:sticky lg:top-6">
        <h2 className="font-bold">Bill total</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <Row label={`${totals.totalSets} sets · ${totals.totalPieces} pcs`} value={formatINR(totals.grossAmount)} />
          {totals.discountAmount > 0 && <Row label="Discount" value={`− ${formatINR(totals.discountAmount)}`} />}
          <Row label="Taxable value" value={formatINR(totals.taxableAmount)} />
          {gstMode === "with" ? (
            <>
              <Row label={`CGST ${totals.cgstRate}%`} value={formatINR(totals.cgstAmount)} />
              <Row label={`SGST ${totals.sgstRate}%`} value={formatINR(totals.sgstAmount)} />
            </>
          ) : (
            <Row label="GST" value="Not charged" />
          )}
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
            <p className="text-xs font-semibold text-muted">{gstMode === "with" ? "Total with GST" : "Total, no GST"}</p>
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
      <input id={id} aria-label={label} className="field h-10 min-h-0 w-20 pr-7 text-right tnum" type="number" inputMode="decimal" min="0" max="100" placeholder="0" value={value} onChange={(e) => onChange(e.target.value)} />
      <Percent size={13} className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-muted" />
    </span>
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
