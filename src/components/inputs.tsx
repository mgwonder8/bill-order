"use client";

import { Minus, Plus } from "lucide-react";

export function Stepper({ value, onChange, label, min = 0 }: { value: number; onChange: (v: number) => void; label: string; min?: number }) {
  return (
    <div className="flex items-center rounded-xl border border-line">
      <button type="button" className="grid h-11 w-11 place-items-center rounded-l-xl active:bg-black/[0.05] disabled:opacity-30" onClick={() => onChange(value - 1)} disabled={value <= min} aria-label={`One ${label.replace(/s$/, "")} less`}>
        <Minus size={18} />
      </button>
      <input
        className="h-11 w-14 border-x border-line bg-transparent text-center text-lg font-extrabold outline-none tnum"
        type="number"
        inputMode="numeric"
        min={min}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={`Number of ${label}`}
      />
      <button type="button" className="grid h-11 w-11 place-items-center rounded-r-xl text-accent active:bg-accent-soft" onClick={() => onChange(value + 1)} aria-label={`One ${label.replace(/s$/, "")} more`}>
        <Plus size={18} />
      </button>
    </div>
  );
}

export function Money({ label, value, onChange, highlight = false }: { label: string; value: string; onChange: (v: string) => void; highlight?: boolean }) {
  return (
    <label className="block min-w-0">
      <span className={`mb-1 block text-xs font-semibold ${highlight ? "text-warn" : "text-muted"}`}>{label}</span>
      <span className="relative block">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm font-semibold text-muted">₹</span>
        <input
          className={`field h-11 min-h-0 pl-7 tnum ${highlight ? "border-warn/50 bg-warn-soft" : ""}`}
          type="number"
          inputMode="decimal"
          min="0"
          placeholder="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </span>
    </label>
  );
}
