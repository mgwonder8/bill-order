"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { billMoney, formatINR, lineMoney } from "@/lib/money";
import type { Order, OrderItem } from "@/lib/types";
import { StepBadge } from "@/components/ui";

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

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
      <div className="space-y-5">
        <section className="rounded-2xl border border-line bg-surface p-4 shadow-sm md:p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <StepBadge n={1} small /> Bill to
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field id="cust" label="Customer / shop name" value={customerName} onChange={setCustomerName} />
            <Field id="phone" label="Phone (for WhatsApp)" value={customerPhone} onChange={setCustomerPhone} />
            <Field id="gstin" label="Customer GST number (optional)" value={customerGstin} onChange={(v) => setCustomerGstin(v.toUpperCase())} />
            <Field id="addr" label="Address (optional)" value={customerAddress} onChange={setCustomerAddress} />
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-4 shadow-sm md:p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <StepBadge n={2} small /> Items and discount
            </h2>
            <div className="flex items-end gap-2">
              <div>
                <label className="label" htmlFor="all">
                  Same discount % for all
                </label>
                <input
                  id="all"
                  className="field w-28 tnum"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="100"
                  placeholder="0"
                  value={allPct}
                  onChange={(e) => applyAll(e.target.value)}
                />
              </div>
            </div>
          </div>

          <ul className="mt-4 space-y-3">
            {items.map((i) => {
              const m = lineMoney({ ...i, discountPct: pct(i.id) });
              return (
                <li key={i.id} className="rounded-xl border border-line p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-lg font-bold">
                        {i.articleCode} <span className="font-semibold text-accent">· Size {i.size}</span>
                      </p>
                      <p className="text-base">
                        <b className="tnum">{i.sets}</b> set{i.sets === 1 ? "" : "s"} = <b className="tnum">{m.pieces} pcs</b> ×{" "}
                        {formatINR(i.rate)}
                      </p>
                    </div>
                    <p className="text-lg font-semibold tnum">{formatINR(m.gross)}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap items-end justify-between gap-3 border-t border-line pt-3">
                    <div>
                      <label className="label" htmlFor={`d-${i.id}`}>
                        Discount %
                      </label>
                      <input
                        id={`d-${i.id}`}
                        className="field w-28 tnum"
                        type="number"
                        inputMode="decimal"
                        min="0"
                        max="100"
                        placeholder="0"
                        value={discounts[i.id] ?? ""}
                        onChange={(e) => setDiscounts((d) => ({ ...d, [i.id]: e.target.value }))}
                      />
                    </div>
                    <div className="text-right text-base">
                      {m.discountAmount > 0 && <p className="text-muted tnum">− {formatINR(m.discountAmount)} discount</p>}
                      <p className="font-bold tnum">{formatINR(m.taxable)}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <aside className="rounded-2xl border-2 border-accent bg-surface p-5 shadow-sm xl:sticky xl:top-6">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <StepBadge n={3} small /> Bill total
        </h2>

        <dl className="mt-4 space-y-2 text-base">
          <Row label="Total sets" value={String(totals.totalSets)} />
          <Row label="Total pieces" value={String(totals.totalPieces)} />
          <div className="border-t border-line pt-2" />
          <Row label="Amount" value={formatINR(totals.grossAmount)} />
          {totals.discountAmount > 0 && <Row label="Discount" value={`− ${formatINR(totals.discountAmount)}`} />}
          <Row label="Taxable value" value={formatINR(totals.taxableAmount)} />
          <Row label={`CGST ${totals.cgstRate}%`} value={formatINR(totals.cgstAmount)} />
          <Row label={`SGST ${totals.sgstRate}%`} value={formatINR(totals.sgstAmount)} />
          {totals.roundOff !== 0 && <Row label="Round off" value={formatINR(totals.roundOff)} />}
          <div className="flex items-center justify-between border-t border-line pt-3 text-xl font-bold">
            <dt>Total</dt>
            <dd className="tnum">{formatINR(totals.total)}</dd>
          </div>
        </dl>

        <div className="mt-4 grid grid-cols-[110px_1fr] gap-3">
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

        {error && <p className="mt-3 rounded-xl bg-accent-soft px-3 py-2 text-base text-accent">{error}</p>}

        <button type="button" onClick={save} disabled={saving} className="btn btn-primary btn-lg mt-4 w-full">
          {saving && <Loader2 className="animate-spin" size={18} />}
          Confirm & make bill
        </button>
        <p className="mt-2 text-center text-sm text-muted">The bill is saved with today&apos;s date and time.</p>
      </aside>
    </div>
  );
}

function Field({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <input id={id} className="field" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className="tnum">{value}</dd>
    </div>
  );
}
