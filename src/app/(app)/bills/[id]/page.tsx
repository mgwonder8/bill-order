import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getBill } from "@/lib/store/data";
import { formatINR } from "@/lib/money";
import { formatDate, formatDateTime, formatTime } from "@/lib/dates";
import { amountInWords } from "@/lib/words";
import { lineQtyLabel, qtyLabel } from "@/lib/sets";
import { shop } from "@/lib/shop";
import { Card, PageHeader } from "@/components/ui";
import { DocActions } from "@/components/doc-actions";

export const metadata = { title: "Bill" };

export default async function BillPage({ params, searchParams }: PageProps<"/bills/[id]">) {
  await requireUser();
  const { id } = await params;
  const justMade = (await searchParams).new === "1";
  const found = await getBill(id);
  if (!found) notFound();
  const { bill, items } = found;

  return (
    <>
      <PageHeader back={{ href: "/bills", label: "Bills" }} title={bill.customerName} subtitle={`${bill.billNo} · ${formatDateTime(bill.createdAt)}`} />

      {justMade && (
        <div className="no-print rise mb-4 flex items-center gap-3 rounded-2xl bg-ok-soft px-4 py-3 text-ok">
          <CheckCircle2 size={22} className="shrink-0" />
          <p className="font-bold">Bill saved. Send it to the customer.</p>
        </div>
      )}

      <Card className="no-print mb-5 flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-muted">Grand total</p>
          <p className="text-3xl font-extrabold tracking-tight tnum">{formatINR(bill.total)}</p>
          <p className="text-sm text-muted tnum">
            {bill.totalPieces} pcs ({qtyLabel(bill.totalPieces)}) · GST {formatINR(bill.cgstAmount + bill.sgstAmount)}
          </p>
        </div>
        <DocActions shop={shop} doc={{ kind: "bill", bill, items }} print />
      </Card>

      <article className="print-sheet card mx-auto max-w-4xl p-5 md:p-8">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold tracking-tight">{shop.name}</h2>
            <p className="mt-0.5 max-w-xs text-sm text-muted">{shop.address}</p>
            {shop.gstin && <p className="text-sm text-muted">GSTIN {shop.gstin}</p>}
            {(shop.phone || shop.email) && <p className="text-sm text-muted">{[shop.phone, shop.email].filter(Boolean).join(" · ")}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Tax invoice</p>
            <p className="mt-1 text-lg font-extrabold tnum">{bill.billNo}</p>
            <p className="text-sm text-muted tnum">
              {formatDate(bill.createdAt)} · {formatTime(bill.createdAt)}
            </p>
          </div>
        </header>

        <section className="grid gap-4 border-b border-line py-4 sm:grid-cols-2">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Bill to</p>
            <p className="mt-1 font-bold">{bill.customerName}</p>
            <p className="text-sm break-words text-muted">
              {[bill.customerPhone, bill.customerGstin && `GSTIN ${bill.customerGstin}`, bill.customerAddress].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Place of supply</p>
            <p className="mt-1 text-sm">{shop.state}</p>
            <p className="text-xs text-muted">Made by {bill.createdBy}</p>
          </div>
        </section>

        <div className="overflow-x-auto py-4">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-bold uppercase tracking-wide text-muted">
                <th className="pb-2">Article</th>
                <th className="pb-2">HSN</th>
                <th className="pb-2">Size set</th>
                <th className="pb-2 text-right">Qty</th>
                <th className="pb-2 text-right">Pcs</th>
                <th className="pb-2 text-right">Rate</th>
                <th className="pb-2 text-right">Amount</th>
                <th className="pb-2 text-right">Disc.</th>
                <th className="pb-2 text-right">Taxable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              {items.map((i) => (
                <tr key={i.id} className="align-top">
                  <td className="py-2.5">
                    <span className="font-bold">{i.articleCode}</span>
                    {i.brand && <div className="text-xs text-muted">{i.brand}</div>}
                  </td>
                  <td className="py-2.5 text-muted tnum">{i.hsn}</td>
                  <td className="py-2.5">{i.size}</td>
                  <td className="py-2.5 text-right font-bold whitespace-nowrap tnum">{lineQtyLabel(i.sets, i.loosePieces)}</td>
                  <td className="py-2.5 text-right tnum">{i.pieces}</td>
                  <td className="py-2.5 text-right tnum">{formatINR(i.rate)}</td>
                  <td className="py-2.5 text-right tnum">{formatINR(i.grossAmount)}</td>
                  <td className="py-2.5 text-right tnum">
                    {i.discountPct > 0 ? (
                      <>
                        {i.discountPct}%<div className="text-xs text-muted">−{formatINR(i.discountAmount)}</div>
                      </>
                    ) : (
                      "–"
                    )}
                  </td>
                  <td className="py-2.5 text-right font-bold tnum">{formatINR(i.taxableAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="flex flex-col gap-5 border-t border-line pt-5 sm:flex-row sm:justify-between">
          <div className="max-w-sm text-sm text-muted">
            <p className="text-xs font-bold uppercase tracking-wider">Amount in words</p>
            <p className="mt-1 text-foreground">{amountInWords(bill.total)}</p>
            {bill.notes && <p className="mt-2">Note: {bill.notes}</p>}
            {shop.bank && <p className="mt-2 whitespace-pre-line">{shop.bank}</p>}
          </div>
          <dl className="w-full max-w-xs space-y-1.5 text-sm sm:ml-auto">
            <Row label="Amount" value={formatINR(bill.grossAmount)} />
            {bill.discountAmount > 0 && <Row label="Less discount" value={`− ${formatINR(bill.discountAmount)}`} />}
            <Row label="Taxable value" value={formatINR(bill.taxableAmount)} />
            <Row label={`CGST ${bill.cgstRate}%`} value={formatINR(bill.cgstAmount)} />
            <Row label={`SGST ${bill.sgstRate}%`} value={formatINR(bill.sgstAmount)} />
            {bill.roundOff !== 0 && <Row label="Round off" value={formatINR(bill.roundOff)} />}
            <div className="flex items-center justify-between rounded-xl bg-accent-soft px-3 py-2.5 text-lg font-extrabold text-accent">
              <dt>Grand total</dt>
              <dd className="tnum">{formatINR(bill.total)}</dd>
            </div>
          </dl>
        </section>

        <footer className="mt-10 flex justify-end text-sm text-muted">
          <div className="text-right">
            <div className="h-10" />
            <p className="border-t border-line pt-1.5">For {shop.name}</p>
          </div>
        </footer>
      </article>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-3">
      <dt className="text-muted">{label}</dt>
      <dd className="tnum">{value}</dd>
    </div>
  );
}
