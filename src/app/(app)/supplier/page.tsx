import Link from "next/link";
import { Phone, Truck } from "lucide-react";
import { requireUser } from "@/lib/session";
import { supplierDay } from "@/lib/store/data";
import { formatINR } from "@/lib/money";
import { formatDate, formatTime, istDay, shiftDay } from "@/lib/dates";
import { shop } from "@/lib/shop";
import { qtyLabel } from "@/lib/sets";
import { Card, EmptyState, PageHeader, Pill } from "@/components/ui";
import { DocActions } from "@/components/doc-actions";

export const metadata = { title: "Supplier report" };

export default async function SupplierPage({ searchParams }: PageProps<"/supplier">) {
  await requireUser();
  const raw = (await searchParams).date;
  const today = istDay();
  const day = typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : today;
  const yesterday = shiftDay(today, -1);
  const compiledAt = new Date().toISOString();
  const { suppliers, billCount } = await supplierDay(day);

  const totalPieces = suppliers.reduce((s, x) => s + x.totalPieces, 0);
  const chip = (active: boolean) =>
    `rounded-lg px-3.5 py-2 text-sm font-bold transition-colors ${active ? "bg-accent text-white" : "text-muted hover:text-foreground"}`;

  return (
    <>
      <PageHeader step={3} title="Supplier report" subtitle="What you sold in a day from each supplier, at their rate. Send it to them." />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl border border-line bg-surface p-1">
          <Link href="/supplier" className={chip(day === today)}>
            Today
          </Link>
          <Link href={`/supplier?date=${yesterday}`} className={chip(day === yesterday)}>
            Yesterday
          </Link>
        </div>
        <form method="get" className="flex items-center gap-2">
          <input aria-label="Pick a date" name="date" type="date" defaultValue={day} max={today} className="field h-11 min-h-0 w-auto py-1.5" />
          <button type="submit" className="btn btn-outline btn-sm h-11">
            Show
          </button>
        </form>
      </div>

      <div className="mb-5 grid grid-cols-3 gap-2 md:gap-3">
        <Summary label="Date" value={formatDate(day)} />
        <Summary label="Bills" value={String(billCount)} />
        <Summary label="Sold" value={qtyLabel(totalPieces)} hint={`${totalPieces} pcs`} />
      </div>

      {suppliers.length === 0 ? (
        <EmptyState icon={Truck} title={`Nothing billed on ${formatDate(day)}`} body="When orders are confirmed into bills, items collect here for each supplier." />
      ) : (
        <>
          {suppliers.length > 1 && (
            <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-bold">All {suppliers.length} suppliers in one PDF</p>
                <p className="text-sm text-muted">One page per supplier · compiled {formatTime(compiledAt)}</p>
              </div>
              <DocActions shop={shop} doc={{ kind: "supplier", day, suppliers, compiledAt }} compact />
            </Card>
          )}

          <div className="space-y-4">
            {suppliers.map((sup) => (
              <Card key={sup.supplierName} className="overflow-hidden">
                <div className="flex flex-wrap items-start gap-3 p-4 md:p-5">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-base font-extrabold uppercase text-accent">
                    {sup.supplierName.charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-extrabold leading-tight">{sup.supplierName}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
                      {sup.supplierGstin ? <span className="tnum">GSTIN {sup.supplierGstin}</span> : <Pill tone="warn">GST no. not added</Pill>}
                      {sup.supplierPhone && (
                        <span className="inline-flex items-center gap-1 tnum">
                          <Phone size={13} /> {sup.supplierPhone}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-extrabold tnum">{qtyLabel(sup.totalPieces)}</p>
                    <p className="text-sm text-muted tnum">
                      {sup.totalPieces} pcs · {formatINR(sup.totalAmount)}
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto border-t border-line">
                  <table className="w-full min-w-[480px] text-sm">
                    <thead>
                      <tr className="bg-background/60 text-left text-xs font-bold uppercase tracking-wide text-muted">
                        <th className="px-4 py-2.5 md:px-5">Article</th>
                        <th className="px-2 py-2.5">Size set</th>
                        <th className="px-2 py-2.5 text-right">Qty</th>
                        <th className="px-2 py-2.5 text-right">Pcs</th>
                        <th className="px-2 py-2.5 text-right">Their rate</th>
                        <th className="px-4 py-2.5 text-right md:px-5">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {sup.lines.map((l) => (
                        <tr key={`${l.articleCode}-${l.size}-${l.rate}`}>
                          <td className="px-4 py-2.5 font-bold md:px-5">{l.articleCode}</td>
                          <td className="px-2 py-2.5">{l.size}</td>
                          <td className="px-2 py-2.5 text-right font-bold whitespace-nowrap tnum">{qtyLabel(l.pieces)}</td>
                          <td className="px-2 py-2.5 text-right tnum">{l.pieces}</td>
                          <td className="px-2 py-2.5 text-right tnum">{formatINR(l.rate)}</td>
                          <td className="px-4 py-2.5 text-right tnum md:px-5">{formatINR(l.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line p-4 md:px-5">
                  <p className="text-xs text-muted">Bills: {sup.billNos.join(", ")}</p>
                  <DocActions shop={shop} doc={{ kind: "supplier", day, suppliers: [sup], compiledAt }} compact />
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function Summary({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="px-3 py-2.5 md:px-4 md:py-3">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className="truncate font-extrabold tnum">{value}</p>
      {hint && <p className="text-xs text-muted tnum">{hint}</p>}
    </Card>
  );
}
