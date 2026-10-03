import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, FileText, Pencil } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getOrder } from "@/lib/store/data";
import { formatINR } from "@/lib/money";
import { formatDate, formatTime } from "@/lib/dates";
import { shop } from "@/lib/shop";
import { Card, Pill, StepBadge } from "@/components/ui";
import { DocActions } from "@/components/doc-actions";

export const metadata = { title: "Order form" };

export default async function OrderPage({ params }: PageProps<"/orders/[id]">) {
  await requireUser();
  const { id } = await params;
  const found = await getOrder(id);
  if (!found) notFound();
  const { order, items } = found;
  const open = order.status === "open";

  return (
    <>
      <div className="no-print mb-4">
        <Link href="/orders" className="text-base text-muted hover:text-foreground">
          &larr; All orders
        </Link>
      </div>

      <div className="no-print mb-5 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <p className="flex items-center gap-2 text-lg font-bold">
            <StepBadge n={1} small /> Send the order form
          </p>
          <p className="mt-1 mb-3 text-base text-muted">Download it, or share the PDF on WhatsApp.</p>
          <DocActions shop={shop} doc={{ kind: "order", order, items }} print />
        </Card>

        <Card className={`p-5 ${open ? "border-2 border-accent" : ""}`}>
          <p className="flex items-center gap-2 text-lg font-bold">
            <StepBadge n={2} small /> {open ? "Confirm and make the bill" : "Bill made"}
          </p>
          {open ? (
            <>
              <p className="mt-1 mb-3 text-base text-muted">When the customer agrees, confirm to make the GST bill.</p>
              <div className="flex flex-wrap gap-2">
                <Link href={`/bills/new?order=${order.id}`} className="btn btn-primary">
                  Confirm & make bill <ArrowRight size={18} />
                </Link>
                <Link href={`/orders/${order.id}/edit`} className="btn btn-outline">
                  <Pencil size={17} /> Change order
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="mt-1 mb-3 text-base text-muted">This order is confirmed and billed.</p>
              <Link href={`/bills/${order.billId}`} className="btn btn-primary">
                <FileText size={18} /> Open the bill
              </Link>
            </>
          )}
        </Card>
      </div>

      <article className="print-sheet mx-auto max-w-4xl rounded-2xl border border-line bg-surface p-5 shadow-sm md:p-8">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
          <div>
            <h1 className="text-xl font-bold tracking-tight">{shop.name}</h1>
            <p className="mt-1 max-w-xs text-sm text-muted">{shop.address}</p>
            {shop.gstin && <p className="text-sm text-muted">GSTIN {shop.gstin}</p>}
          </div>
          <div className="text-right">
            <p className="text-sm font-bold uppercase tracking-widest text-accent">Order form</p>
            <p className="mt-1 text-xl font-bold tnum">{order.orderNo}</p>
            <p className="text-base tnum">Date: {formatDate(order.createdAt)}</p>
            <p className="text-base tnum">Time: {formatTime(order.createdAt)}</p>
            <div className="mt-1">
              <Pill tone={open ? "warn" : "ok"}>{open ? "Waiting for bill" : "Billed"}</Pill>
            </div>
          </div>
        </header>

        <section className="border-b border-line py-4">
          <p className="text-sm font-semibold uppercase tracking-wider text-muted">Customer</p>
          <p className="mt-1 text-lg font-semibold">{order.customerName || "Walk-in customer"}</p>
          {order.customerPhone && <p className="text-base text-muted tnum">{order.customerPhone}</p>}
          {order.customerGstin && <p className="text-base text-muted">GSTIN {order.customerGstin}</p>}
          {order.customerAddress && <p className="text-base text-muted">{order.customerAddress}</p>}
        </section>

        <div className="overflow-x-auto py-4">
          <table className="w-full min-w-[600px] text-base">
            <thead>
              <tr className="border-b border-line text-left text-sm text-muted">
                <th className="pb-2 font-semibold">#</th>
                <th className="pb-2 font-semibold">Article</th>
                <th className="pb-2 font-semibold">Size set</th>
                <th className="pb-2 text-right font-semibold">Sets</th>
                <th className="pb-2 text-right font-semibold">Pieces</th>
                <th className="pb-2 text-right font-semibold">Rate/pc</th>
                <th className="pb-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i, n) => (
                <tr key={i.id} className="border-b border-line/70 align-top">
                  <td className="py-2.5 pr-3 text-muted tnum">{n + 1}</td>
                  <td className="py-2.5">
                    <span className="font-semibold">{i.articleCode}</span>
                    <div className="text-sm text-muted">{[i.brand, i.supplierName].filter(Boolean).join(" · ")}</div>
                  </td>
                  <td className="py-2.5">
                    {i.size}
                    {i.sizes && <div className="text-sm text-muted">{i.sizes.replaceAll("/", ", ")}</div>}
                  </td>
                  <td className="py-2.5 text-right font-semibold tnum">{i.sets}</td>
                  <td className="py-2.5 text-right tnum">
                    {i.pieces}
                    <div className="text-xs text-muted">
                      {i.sets} × {i.pcsPerSet}
                    </div>
                  </td>
                  <td className="py-2.5 text-right tnum">{formatINR(i.rate)}</td>
                  <td className="py-2.5 text-right font-semibold tnum">{formatINR(i.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-bold">
                <td className="pt-3" colSpan={3}>
                  Total
                </td>
                <td className="pt-3 text-right tnum">{order.totalSets}</td>
                <td className="pt-3 text-right tnum">{order.totalPieces}</td>
                <td />
                <td className="pt-3 text-right tnum">{formatINR(order.totalAmount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="text-sm text-muted">
          Amount is before GST. CGST 2.5% and SGST 2.5% are added on the bill.
          {order.notes && <> Notes: {order.notes}</>}
        </p>
      </article>
    </>
  );
}
