"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Loader2, Search } from "lucide-react";
import { formatINR } from "@/lib/money";
import { SET_PCS, qtyLabel } from "@/lib/sets";
import type { StockItem } from "@/lib/types";
import { Card } from "@/components/ui";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "low", label: "Low" },
  { key: "out", label: "Out" },
] as const;
type Filter = (typeof FILTERS)[number]["key"];

const isOut = (z: StockItem) => z.inStock <= 0;
const isLow = (z: StockItem) => z.inStock > 0 && z.inStock < SET_PCS;

export function StockClient({ stock }: { stock: StockItem[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const counts = { all: stock.length, low: stock.filter(isLow).length, out: stock.filter(isOut).length };
  const totalPieces = stock.reduce((s, z) => s + Math.max(0, z.inStock), 0);
  const value = stock.reduce((s, z) => s + Math.max(0, z.inStock) * z.rate, 0);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return stock
      .filter((z) => (filter === "low" ? isLow(z) : filter === "out" ? isOut(z) : true))
      .filter((z) => !q || `${z.articleCode} ${z.brand} ${z.supplierName} ${z.size}`.toLowerCase().includes(q));
  }, [stock, query, filter]);

  const bySupplier = new Map<string, StockItem[]>();
  for (const z of shown) bySupplier.set(z.supplierName || "Unknown supplier", [...(bySupplier.get(z.supplierName || "Unknown supplier") ?? []), z]);

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-2 md:gap-3">
        <Card className="px-4 py-3">
          <p className="text-xs font-semibold text-muted">In stock</p>
          <p className="font-extrabold tnum">{qtyLabel(totalPieces)}</p>
        </Card>
        <Card className="px-4 py-3">
          <p className="text-xs font-semibold text-muted">Value at supplier rate</p>
          <p className="font-extrabold tnum">{formatINR(value)}</p>
        </Card>
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" size={18} />
          <input className="field pl-10" placeholder="Search article, brand or supplier" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="grid grid-cols-3 rounded-xl border border-line bg-surface p-1 sm:inline-grid">
          {FILTERS.map((f) => (
            <button key={f.key} type="button" onClick={() => setFilter(f.key)} className={`rounded-lg px-3 py-2 text-sm font-bold ${filter === f.key ? "bg-accent text-white" : "text-muted"}`}>
              {f.label} <span className={filter === f.key ? "text-white/75" : "text-muted/70"}>{counts[f.key]}</span>
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <Card className="px-5 py-10 text-center text-sm text-muted">Nothing here.</Card>
      ) : (
        <div className="space-y-5">
          {[...bySupplier.entries()].map(([supplier, items]) => (
            <section key={supplier}>
              <h2 className="mb-2 px-1 text-sm font-bold">{supplier}</h2>
              <Card>
                <ul className="divide-y divide-line">
                  {items.map((z) => (
                    <li key={z.id} className="px-4 py-3 md:px-5">
                      <div className="flex items-start gap-3">
                        <Link href={`/tags/${z.tagId}`} className="min-w-0 flex-1">
                          <p className="font-extrabold break-words">
                            {z.articleCode} <span className="font-bold text-accent">· {z.size}</span>
                          </p>
                          <p className="text-xs text-muted tnum">
                            Supplier {formatINR(z.rate)}/pc · ordered {z.orderedPieces} · sold {z.soldPieces}
                          </p>
                        </Link>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap tnum ${
                            isOut(z) ? "bg-danger-soft text-danger" : isLow(z) ? "bg-warn-soft text-warn" : "bg-ok-soft text-ok"
                          }`}
                        >
                          {isOut(z) ? (z.inStock < 0 ? `Short ${qtyLabel(-z.inStock)}` : "Out of stock") : qtyLabel(z.inStock)}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <span className={`text-xs font-semibold ${z.sellRate > 0 ? "text-muted" : "text-warn"}`}>{z.sellRate > 0 ? "Selling price / pc" : "Set a selling price"}</span>
                        <SellPrice item={z} />
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

function SellPrice({ item }: { item: StockItem }) {
  const router = useRouter();
  const [value, setValue] = useState(item.sellRate > 0 ? String(item.sellRate) : "");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const dirty = (Number(value) || 0) !== item.sellRate;

  async function save() {
    setState("saving");
    try {
      const res = await fetch(`/api/sizes/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sellRate: Number(value) || 0 }) });
      setState(res.ok ? "saved" : "error");
      if (res.ok) router.refresh();
    } catch {
      setState("error");
    }
  }

  return (
    <form
      className="flex items-center gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <label className="relative">
        <span className="sr-only">Selling price per piece for {item.articleCode} {item.size}</span>
        <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-xs font-semibold text-muted">₹</span>
        <input
          className={`field h-10 min-h-0 w-24 pl-6 text-sm tnum ${item.sellRate > 0 ? "" : "border-warn/50 bg-warn-soft"}`}
          type="number"
          inputMode="decimal"
          min="0"
          placeholder="Sell /pc"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setState("idle");
          }}
        />
      </label>
      {dirty ? (
        <button type="submit" className="btn btn-primary btn-sm h-10 px-3" disabled={state === "saving"} aria-label="Save selling price">
          {state === "saving" ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
        </button>
      ) : state === "saved" ? (
        <Check size={18} className="text-ok" aria-label="Saved" />
      ) : null}
      {state === "error" && <span className="text-xs text-danger">Not saved</span>}
    </form>
  );
}
