"use client";

import { useId, useMemo, useState } from "react";
import { ChevronDown, UserPlus, UserRound } from "lucide-react";
import type { Customer } from "@/lib/types";

export type CustomerDraft = { name: string; phone: string; gstin: string; address: string };

const phoneKey = (v: string) => v.replace(/\D/g, "").slice(-10);

/**
 * Customer name with live search over saved customers. Picking one fills the phone, GST number
 * and address; a new name is simply kept and saved with the order.
 */
export function CustomerPicker({
  customers,
  value,
  onChange,
}: {
  customers: Customer[];
  value: CustomerDraft;
  onChange: (v: CustomerDraft) => void;
}) {
  const uid = useId();
  const [open, setOpen] = useState(false);
  const [more, setMore] = useState(Boolean(value.gstin || value.address));

  const matches = useMemo(() => {
    const q = value.name.trim().toLowerCase();
    const p = phoneKey(value.name);
    if (!q) return customers.slice(0, 6);
    return customers.filter((c) => c.name.toLowerCase().includes(q) || (p.length >= 4 && phoneKey(c.phone).includes(p))).slice(0, 6);
  }, [customers, value.name]);

  const exact = customers.some((c) => c.name.trim().toLowerCase() === value.name.trim().toLowerCase());

  function pick(c: Customer) {
    onChange({ name: c.name, phone: c.phone || value.phone, gstin: c.gstin || value.gstin, address: c.address || value.address });
    if (c.gstin || c.address) setMore(true);
    setOpen(false);
  }

  function setPhone(phone: string) {
    const k = phoneKey(phone);
    const c = k.length === 10 ? customers.find((x) => phoneKey(x.phone) === k) : undefined;
    onChange(c ? { name: value.name || c.name, phone, gstin: value.gstin || c.gstin, address: value.address || c.address } : { ...value, phone });
  }

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="relative">
          <label className="label" htmlFor={`${uid}-name`}>
            Customer name
          </label>
          <input
            id={`${uid}-name`}
            className="field"
            placeholder="Search or type a new name"
            autoComplete="off"
            value={value.name}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onChange={(e) => {
              onChange({ ...value, name: e.target.value });
              setOpen(true);
            }}
          />
          {open && (matches.length > 0 || value.name.trim()) && (
            <div className="rise absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
              {matches.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(c)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-accent-soft"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-bold uppercase text-accent">
                    {c.name.charAt(0) || <UserRound size={14} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{c.name}</span>
                    <span className="block truncate text-xs text-muted tnum">{[c.phone, c.gstin && `GST ${c.gstin}`].filter(Boolean).join(" · ") || "No phone saved"}</span>
                  </span>
                </button>
              ))}
              {value.name.trim() && !exact && (
                <p className="flex items-center gap-2 border-t border-line px-3 py-2.5 text-sm text-muted">
                  <UserPlus size={16} className="text-accent" /> New customer <b className="text-foreground">{value.name.trim()}</b> will be saved
                </p>
              )}
            </div>
          )}
        </div>
        <div>
          <label className="label" htmlFor={`${uid}-phone`}>
            Phone (WhatsApp)
          </label>
          <input id={`${uid}-phone`} className="field tnum" inputMode="tel" autoComplete="off" value={value.phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
      </div>
      <button type="button" onClick={() => setMore((m) => !m)} className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-accent">
        <ChevronDown size={16} className={more ? "rotate-180" : ""} /> {more ? "Hide GST no. & address" : "GST no. & address"}
      </button>
      {more && (
        <div className="rise mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor={`${uid}-gst`}>
              Customer GST no.
            </label>
            <input id={`${uid}-gst`} className="field uppercase" autoComplete="off" value={value.gstin} onChange={(e) => onChange({ ...value, gstin: e.target.value.toUpperCase() })} />
          </div>
          <div>
            <label className="label" htmlFor={`${uid}-addr`}>
              Address
            </label>
            <input id={`${uid}-addr`} className="field" autoComplete="off" value={value.address} onChange={(e) => onChange({ ...value, address: e.target.value })} />
          </div>
        </div>
      )}
    </div>
  );
}
