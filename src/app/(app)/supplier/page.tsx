import Link from "next/link";
import { requireUser } from "@/lib/session";
import { supplierDay } from "@/lib/store/data";
import { formatINR } from "@/lib/money";
import { formatDate, formatDateTime, istDay, shiftDay } from "@/lib/dates";
import { shop } from "@/lib/shop";
import { Card, EmptyState, PageHeader } from "@/components/ui";
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

  const totalSets = suppliers.reduce((s, x) => s + x.totalSets, 0);
  const totalPieces = suppliers.reduce((s, x) => s + x.totalPieces, 0);

  return (
    <>
      <PageHeader
        step={3}
        title="Daily supplier report"
        subtitle="Everything billed on one day, grouped by supplier. Send it once a day."
      />

      <Card className="mb-5 p-4 md:p-5">
        <form className="flex flex-wrap items-end gap-2" method="get">
          <div>
            <label className="label" htmlFor="date">
              Date
            </label>
            <input id="date" name="date" type="date" defaultValue={day} max={today} className="field w-auto" />
          </div>
          <button type="submit" className="btn btn-dark">
            Show
          </button>
          <Link href="/supplier" className={`btn ${day === today ? "btn-primary" : "btn-outline"}`}>
            Today
          </Link>
          <Link href={`/supplier?date=${yesterday}`} className={`btn ${day === yesterday ? "btn-primary" : "btn-outline"}`}>
            Yesterday
          </Link>
        </form>
        <p className="mt-3 text-base text-muted tnum">
          {formatDate(day)} · {billCount} bill{billCount === 1 ? "" : "s"} · {totalSets} sets = {totalPieces} pcs · compiled{" "}
          {formatDateTime(compiledAt)}
        </p>
      </Card>

      {suppliers.length === 0 ? (
        <EmptyState
          title={`Nothing billed on ${formatDate(day)}`}
          body="When orders are confirmed into bills, the items are collected here for each supplier."
        />
      ) : (
        <>
          {suppliers.length > 1 && (
            <Card className="mb-5 p-5">
              <p className="text-lg font-bold">All suppliers in one PDF</p>
              <p className="mt-1 mb-3 text-base text-muted">One page per supplier.</p>
              <DocActions shop={shop} doc={{ kind: "supplier", day, suppliers, compiledAt }} />
            </Card>
          )}

          <div className="space-y-5">
            {suppliers.map((sup) => (
              <Card key={sup.supplierName} className="p-4 md:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xl font-bold">{sup.supplierName}</p>
                    <p className="text-base text-muted">
                      GST no: {sup.supplierGstin || <span className="text-warn">not added</span>}
                      {sup.supplierPhone && <> · Phone {sup.supplierPhone}</>}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold tnum">
                      {sup.totalSets} sets = {sup.totalPieces} pcs
                    </p>
                    <p className="text-base text-muted tnum">{formatINR(sup.totalAmount)} at tag rate</p>
                  </div>
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[520px] text-base">
                    <thead>
                      <tr className="border-b border-line text-left text-sm text-muted">
                        <th className="pb-2 font-semibold">Article code</th>
                        <th className="pb-2 font-semibold">Size set</th>
                        <th className="pb-2 text-right font-semibold">Sets</th>
                        <th className="pb-2 text-right font-semibold">Pieces</th>
                        <th className="pb-2 text-right font-semibold">Rate/pc</th>
                        <th className="pb-2 text-right font-semibold">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sup.lines.map((l) => (
                        <tr key={`${l.articleCode}-${l.size}-${l.rate}`} className="border-b border-line/70">
                          <td className="py-2.5 font-semibold">{l.articleCode}</td>
                          <td className="py-2.5">{l.size}</td>
                          <td className="py-2.5 text-right font-semibold tnum">{l.sets}</td>
                          <td className="py-2.5 text-right tnum">{l.pieces}</td>
                          <td className="py-2.5 text-right tnum">{formatINR(l.rate)}</td>
                          <td className="py-2.5 text-right tnum">{formatINR(l.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-sm text-muted">From bills: {sup.billNos.join(", ")}</p>

                <div className="mt-4 border-t border-line pt-4">
                  <DocActions shop={shop} doc={{ kind: "supplier", day, suppliers: [sup], compiledAt }} />
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </>
  );
}
