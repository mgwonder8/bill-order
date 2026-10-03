import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getBill } from "@/lib/store/data";
import { formatINR } from "@/lib/money";
import { formatDate, formatTime } from "@/lib/dates";
import { amountInWords } from "@/lib/words";
import { shop } from "@/lib/shop";
import { Card } from "@/components/ui";
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
      <div className="no-print mb-4">
        <Link href="/bills" className="text-base text-muted hover:text-foreground">
          &larr; All bills
        </Link>
      </div>

      {justMade && (
        <div className="no-print mb-4 flex items-center gap-3 rounded-2xl bg-ok/10 px-5 py-4 text-ok">
          <CheckCircle2 size={24} />
          <p className="text-base font-semibold">Bill {bill.billNo} is saved. Send it to the customer below.</p>
        </div>
      )}

      <Card className="no-print mb-5 p-5">
        <p className="text-lg font-bold">Send or save this bill</p>
        <p className="mt-1 mb-3 text-base text-muted">
          &quot;Share PDF&quot; opens WhatsApp, email and more on a phone. &quot;WhatsApp&quot; sends a summary message.
        </p>
        <DocActions shop={shop} doc={{ kind: "bill", bill, items }} print />
      </Card>

      <article className="print-sheet mx-auto max-w-4xl rounded-2xl border border-line bg-surface p-5 shadow-sm md:p-8">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
          <div>
            <h1 className="text-xl font-bold tracking-tight">{shop.name}</h1>
            <p className="mt-1 max-w-xs text-sm text-muted">{shop.address}</p>
            {shop.gstin && <p className="text-sm text-muted">GSTIN {shop.gstin}</p>}
            {(shop.phone || shop.email) && <p className="text-sm text-muted">{[shop.phone, shop.email].filter(Boolean).join(" · ")}</p>}
          </div>
          <div className="text-right">
            <p className="text-sm font-bold uppercase tracking-widest text-accent">Tax invoice</p>
            <p className="mt-1 text-xl font-bold tnum">{bill.billNo}</p>
            <p className="text-base tnum">Date: {formatDate(bill.createdAt)}</p>
            <p className="text-base tnum">Time: {formatTime(bill.createdAt)}</p>
            {bill.orderNo && <p className="text-sm text-muted tnum">Order {bill.orderNo}</p>}
          </div>
        </header>

        <section className="grid gap-4 border-b border-line py-4 sm:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-muted">Bill to</p>
            <p className="mt-1 text-lg font-semibold">{bill.customerName}</p>
            {bill.customerPhone && <p className="text-base text-muted tnum">{bill.customerPhone}</p>}
            {bill.customerGstin && <p className="text-base text-muted">GSTIN {bill.customerGstin}</p>}
            {bill.customerAddress && <p className="text-base text-muted">{bill.customerAddress}</p>}
          </div>
          <div className="sm:text-right">
            <p className="text-sm font-semibold uppercase tracking-wider text-muted">Place of supply</p>
            <p className="mt-1 text-base">{shop.state}</p>
            <p className="mt-1 text-sm text-muted">Made by {bill.createdBy}</p>
          </div>
        </section>

        <div className="overflow-x-auto py-4">
          <table className="w-full min-w-[760px] text-sm md:text-base">
            <thead>
              <tr className="border-b border-line text-left text-sm text-muted">
                <th className="pb-2 font-semibold">#</th>
                <th className="pb-2 font-semibold">Article</th>
                <th className="pb-2 font-semibold">HSN</th>
                <th className="pb-2 font-semibold">Size set</th>
                <th className="pb-2 text-right font-semibold">Sets</th>
                <th className="pb-2 text-right font-semibold">Pcs</th>
                <th className="pb-2 text-right font-semibold">Rate/pc</th>
                <th className="pb-2 text-right font-semibold">Amount</th>
                <th className="pb-2 text-right font-semibold">Disc.</th>
                <th className="pb-2 text-right font-semibold">Taxable</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i, n) => (
                <tr key={i.id} className="border-b border-line/70 align-top">
                  <td className="py-2.5 pr-3 text-muted tnum">{n + 1}</td>
                  <td className="py-2.5">
                    <span className="font-semibold">{i.articleCode}</span>
                    {i.brand && <div className="text-sm text-muted">{i.brand}</div>}
                  </td>
                  <td className="py-2.5 text-muted tnum">{i.hsn}</td>
                  <td className="py-2.5">
                    {i.size}
                    {i.sizes && <div className="text-xs text-muted">{i.sizes.replaceAll("/", ", ")}</div>}
                  </td>
                  <td className="py-2.5 text-right font-semibold tnum">{i.sets}</td>
                  <td className="py-2.5 text-right tnum">{i.pieces}</td>
                  <td className="py-2.5 text-right tnum">{formatINR(i.rate)}</td>
                  <td className="py-2.5 text-right tnum">{formatINR(i.grossAmount)}</td>
                  <td className="py-2.5 text-right tnum">
                    {i.discountPct > 0 ? (
                      <>
                        {i.discountPct}%<div className="text-xs text-muted">− {formatINR(i.discountAmount)}</div>
                      </>
                    ) : (
                      "–"
                    )}
                  </td>
                  <td className="py-2.5 text-right font-semibold tnum">{formatINR(i.taxableAmount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-bold">
                <td className="pt-3" colSpan={4}>
                  Total
                </td>
                <td className="pt-3 text-right tnum">{bill.totalSets}</td>
                <td className="pt-3 text-right tnum">{bill.totalPieces}</td>
                <td />
                <td className="pt-3 text-right tnum">{formatINR(bill.grossAmount)}</td>
                <td className="pt-3 text-right tnum">{bill.discountAmount > 0 ? `− ${formatINR(bill.discountAmount)}` : ""}</td>
                <td className="pt-3 text-right tnum">{formatINR(bill.taxableAmount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <section className="flex flex-col gap-5 border-t border-line pt-5 sm:flex-row sm:justify-between">
          <div className="max-w-sm text-sm text-muted">
            <p className="font-semibold uppercase tracking-wider">Amount in words</p>
            <p className="mt-1 text-base text-foreground">{amountInWords(bill.total)}</p>
            <p className="mt-2">
              {bill.totalSets} sets = {bill.totalPieces} pieces
            </p>
            {bill.notes && <p className="mt-2">{bill.notes}</p>}
            {shop.bank && <p className="mt-2 whitespace-pre-line">{shop.bank}</p>}
          </div>

          <dl className="w-full max-w-xs space-y-1.5 text-base sm:ml-auto">
            <Row label="Amount" value={formatINR(bill.grossAmount)} />
            {bill.discountAmount > 0 && <Row label="Less discount" value={`− ${formatINR(bill.discountAmount)}`} />}
            <Row label="Taxable value" value={formatINR(bill.taxableAmount)} />
            <Row label={`CGST ${bill.cgstRate}%`} value={formatINR(bill.cgstAmount)} />
            <Row label={`SGST ${bill.sgstRate}%`} value={formatINR(bill.sgstAmount)} />
            {bill.roundOff !== 0 && <Row label="Round off" value={formatINR(bill.roundOff)} />}
            <div className="flex items-center justify-between border-t border-line pt-2.5 text-xl font-bold">
              <dt>Grand total</dt>
              <dd className="tnum">{formatINR(bill.total)}</dd>
            </div>
          </dl>
        </section>

        <footer className="mt-10 flex items-end justify-end text-sm text-muted">
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
    <div className="flex items-center justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className="tnum">{value}</dd>
    </div>
  );
}
