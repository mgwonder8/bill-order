"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, PackagePlus, Phone } from "lucide-react";
import { formatINR } from "@/lib/money";
import { formatTime } from "@/lib/dates";
import type { ShopInfo } from "@/lib/types";
import type { CompileLine, CompileOrder, CompileSupplier } from "@/lib/store/data";
import { Card, Pill } from "@/components/ui";
import { DocActions } from "@/components/doc-actions";

const VIEWS = [
  { key: "supplier", label: "By supplier" },
  { key: "brand", label: "By brand" },
  { key: "order", label: "By order" },
] as const;
type View = (typeof VIEWS)[number]["key"];

export function CompileClient({
  shop,
  day,
  compiledAt,
  suppliers,
  orders,
}: {
  shop: ShopInfo;
  day: string;
  compiledAt: string;
  suppliers: CompileSupplier[];
  orders: CompileOrder[];
}) {
  const [view, setView] = useState<View>("supplier");

  const brands = new Map<string, { brand: string; lines: (CompileLine & { supplierName: string })[]; sets: number; pieces: number }>();
  for (const s of suppliers)
    for (const b of s.brands) {
      const k = b.brand.toUpperCase();
      const g = brands.get(k) ?? { brand: b.brand, lines: [], sets: 0, pieces: 0 };
      g.lines.push(...b.lines.map((l) => ({ ...l, supplierName: s.supplierName })));
      g.sets += b.totalSets;
      g.pieces += b.totalPieces;
      brands.set(k, g);
    }

  return (
    <>
      <div className="mb-4 grid grid-cols-3 rounded-xl border border-line bg-surface p-1 sm:inline-grid">
        {VIEWS.map((v) => (
          <button key={v.key} type="button" onClick={() => setView(v.key)} className={`rounded-lg px-3.5 py-2 text-sm font-bold ${view === v.key ? "bg-accent text-white" : "text-muted"}`}>
            {v.label}
          </button>
        ))}
      </div>

      {view === "supplier" && (
        <div className="space-y-4">
          {suppliers.length > 1 && (
            <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
              <p className="font-bold">All {suppliers.length} suppliers in one PDF</p>
              <DocActions shop={shop} doc={{ kind: "compile", day, suppliers, compiledAt }} compact />
            </Card>
          )}
          {suppliers.map((s) => (
            <Card key={s.supplierName} className="overflow-hidden">
              <div className="flex flex-wrap items-start gap-3 p-4 md:p-5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-base font-extrabold uppercase text-accent">{s.supplierName.charAt(0)}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-extrabold leading-tight">{s.supplierName}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
                    {s.supplierGstin ? <span className="tnum">GSTIN {s.supplierGstin}</span> : <Pill tone="warn">GST no. not added</Pill>}
                    {s.supplierPhone && (
                      <span className="inline-flex items-center gap-1 tnum">
                        <Phone size={13} /> {s.supplierPhone}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-extrabold tnum">{s.totalSets} sets</p>
                  <p className="text-sm text-muted tnum">{s.totalPieces} pcs</p>
                </div>
              </div>
              {s.brands.map((b) => (
                <div key={b.brand} className="border-t border-line">
                  <div className="flex items-baseline justify-between bg-background/60 px-4 py-2 md:px-5">
                    <p className="text-sm font-extrabold">{b.brand}</p>
                    <p className="text-xs font-bold text-muted tnum">
                      {b.totalSets} sets · {b.totalPieces} pcs
                    </p>
                  </div>
                  <ul className="divide-y divide-line">
                    {b.lines.map((l) => (
                      <LineRow key={`${l.articleCode}-${l.size}`} line={l} />
                    ))}
                  </ul>
                </div>
              ))}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line p-4 md:px-5">
                <p className="text-xs text-muted">From {s.orderNos.join(", ")}</p>
                <div className="flex flex-wrap gap-2">
                  <DocActions shop={shop} doc={{ kind: "compile", day, suppliers: [s], compiledAt }} compact />
                  <Link href={`/orders/new?day=${day}&supplier=${encodeURIComponent(s.supplierName)}`} className="btn btn-primary btn-sm">
                    <PackagePlus size={17} /> Make supplier order
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {view === "brand" && (
        <div className="space-y-4">
          {[...brands.values()]
            .sort((a, b) => a.brand.localeCompare(b.brand))
            .map((g) => (
              <Card key={g.brand} className="overflow-hidden">
                <div className="flex items-baseline justify-between p-4 md:px-5">
                  <p className="text-lg font-extrabold">{g.brand}</p>
                  <p className="text-sm font-bold text-muted tnum">
                    {g.sets} sets · {g.pieces} pcs
                  </p>
                </div>
                <ul className="divide-y divide-line border-t border-line">
                  {g.lines.map((l) => (
                    <LineRow key={`${l.supplierName}-${l.articleCode}-${l.size}`} line={l} supplier={l.supplierName} />
                  ))}
                </ul>
              </Card>
            ))}
        </div>
      )}

      {view === "order" && (
        <div className="space-y-3">
          {orders.map((o) => (
            <Card key={o.id} className="overflow-hidden">
              <Link href={o.kind === "order" ? `/customer-orders/${o.id}` : `/bills/${o.id}`} className="flex items-center gap-3 p-4 hover:bg-black/[0.015] md:px-5">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{o.customerName}</p>
                  <p className="text-sm text-muted tnum">
                    {o.no} · {formatTime(o.createdAt)}
                  </p>
                </div>
                <Pill tone={o.billed ? "ok" : "warn"}>{o.billed ? "Billed" : "Not billed"}</Pill>
                <p className="w-20 text-right font-extrabold tnum">{o.totalSets} sets</p>
              </Link>
              <ul className="divide-y divide-line border-t border-line text-sm">
                {o.lines.map((l, n) => (
                  <li key={n} className="flex items-center gap-3 px-4 py-2 md:px-5">
                    <span className="min-w-0 flex-1 truncate">
                      <b>{l.articleCode}</b> <span className="text-accent">· {l.size}</span> <span className="text-xs text-muted">· {l.supplierName}</span>
                    </span>
                    <span className="text-muted tnum">{l.pieces} pcs</span>
                    <span className="w-14 text-right font-bold tnum">{l.sets} set{l.sets === 1 ? "" : "s"}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

/** One article and size chart with its total; tap to see which customer orders it came from. */
function LineRow({ line, supplier }: { line: CompileLine; supplier?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <li>
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-black/[0.015] md:px-5">
        <ChevronDown size={16} className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold">
            {line.articleCode} <span className="text-accent">· {line.size}</span>
          </span>
          <span className="block truncate text-xs text-muted">
            {[supplier, line.sizes && line.sizes !== line.size ? line.sizes.replaceAll("/", ", ") : "", `${line.sources.length} order${line.sources.length === 1 ? "" : "s"}`].filter(Boolean).join(" · ")}
          </span>
        </span>
        <span className="text-sm text-muted tnum">{line.pieces} pcs</span>
        <span className="w-16 text-right font-extrabold tnum">{line.sets} set{line.sets === 1 ? "" : "s"}</span>
      </button>
      {open && (
        <ul className="rise mx-4 mb-3 rounded-xl bg-background/70 p-2 text-sm md:mx-5">
          {line.sources.map((s, n) => (
            <li key={n}>
              <Link href={s.kind === "order" ? `/customer-orders/${s.id}` : `/bills/${s.id}`} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-surface">
                <span className="w-20 shrink-0 font-semibold text-muted tnum">{s.no}</span>
                <span className="min-w-0 flex-1 truncate">{s.customerName}</span>
                <span className="text-muted tnum">{s.pieces} pcs</span>
                <span className="w-14 text-right font-bold tnum">{s.sets} set{s.sets === 1 ? "" : "s"}</span>
              </Link>
            </li>
          ))}
          {line.rate > 0 && <li className="px-2 pt-1 text-xs text-muted">At supplier rate {formatINR(line.rate)}/pc: {formatINR(line.amount)}</li>}
        </ul>
      )}
    </li>
  );
}
