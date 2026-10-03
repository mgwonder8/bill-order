import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2, FileText, Pencil } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getOrder } from "@/lib/store/data";
import { formatINR } from "@/lib/money";
import { formatDate, formatDateTime, formatTime } from "@/lib/dates";
import { shop } from "@/lib/shop";
import { Card, PageHeader, Pill } from "@/components/ui";
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
      <PageHeader
        back={{ href: "/orders", label: "Orders" }}
        title={order.customerName || "Walk-in customer"}
        subtitle={`${order.orderNo} · ${formatDateTime(order.createdAt)}`}
        action={<Pill tone={open ? "warn" : "ok"}>{open ? "Waiting for bill" : "Billed"}</Pill>}
      />

      <div className="no-print mb-5 grid gap-3 lg:grid-cols-[1.2fr_1fr]">
        {open ? (
          <Card className="flex flex-col gap-4 border-accent/30 bg-gradient-to-br from-accent-soft to-surface p-5 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-accent">Next step</p>
              <p className="mt-0.5 text-lg font-extrabold">Customer agreed? Make the GST bill.</p>
              <p className="text-sm text-muted tnum">
                {order.totalSets} sets · {order.totalPieces} pcs · {formatINR(order.totalAmount)} before GST
              </p>
            </div>
            <div className="flex gap-2">
              <Link href={`/orders/${order.id}/edit`} className="btn btn-outline" aria-label="Change order">
                <Pencil size={17} /> <span className="hidden sm:inline">Change</span>
              </Link>
              <Link href={`/bills/new?order=${order.id}`} className="btn btn-primary flex-1 sm:flex-none">
                Make bill <ArrowRight size={18} />
              </Link>
            </div>
          </Card>
        ) : (
          <Card className="flex flex-col gap-4 border-ok/30 bg-ok-soft p-5 sm:flex-row sm:items-center">
            <CheckCircle2 className="shrink-0 text-ok" size={28} />
            <div className="min-w-0 flex-1">
              <p className="text-lg font-extrabold">This order is billed</p>
              <p className="text-sm text-muted">The order is locked so the bill always matches.</p>
            </div>
            <Link href={`/bills/${order.billId}`} className="btn btn-primary">
              <FileText size={18} /> Open bill
            </Link>
          </Card>
        )}

        <Card className="p-5">
          <p className="mb-3 font-bold">Send the order form</p>
          <DocActions shop={shop} doc={{ kind: "order", order, items }} print compact />
        </Card>
      </div>

      <article className="print-sheet card mx-auto max-w-4xl p-5 md:p-8">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold tracking-tight">{shop.name}</h2>
            <p className="mt-0.5 max-w-xs text-sm text-muted">{shop.address}</p>
            {shop.gstin && <p className="text-sm text-muted">GSTIN {shop.gstin}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Order form</p>
            <p className="mt-1 text-lg font-extrabold tnum">{order.orderNo}</p>
            <p className="text-sm text-muted tnum">
              {formatDate(order.createdAt)} · {formatTime(order.createdAt)}
            </p>
          </div>
        </header>

        <section className="border-b border-line py-4">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Customer</p>
          <p className="mt-1 font-bold">{order.customerName || "Walk-in customer"}</p>
          <p className="text-sm text-muted">
            {[order.customerPhone, order.customerGstin && `GSTIN ${order.customerGstin}`, order.customerAddress].filter(Boolean).join(" · ")}
          </p>
        </section>

        <div className="overflow-x-auto py-4">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-bold uppercase tracking-wide text-muted">
                <th className="pb-2">Article</th>
                <th className="pb-2">Size set</th>
                <th className="pb-2 text-right">Sets</th>
                <th className="pb-2 text-right">Pcs</th>
                <th className="pb-2 text-right">Rate/pc</th>
                <th className="pb-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              {items.map((i) => (
                <tr key={i.id} className="align-top">
                  <td className="py-2.5">
                    <span className="font-bold">{i.articleCode}</span>
                    <div className="text-xs text-muted">{[i.brand, i.supplierName].filter(Boolean).join(" · ")}</div>
                  </td>
                  <td className="py-2.5">
                    {i.size}
                    {i.sizes && <div className="text-xs text-muted">{i.sizes.replaceAll("/", ", ")}</div>}
                  </td>
                  <td className="py-2.5 text-right font-bold tnum">{i.sets}</td>
                  <td className="py-2.5 text-right tnum">{i.pieces}</td>
                  <td className="py-2.5 text-right tnum">{formatINR(i.rate)}</td>
                  <td className="py-2.5 text-right font-bold tnum">{formatINR(i.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-line font-extrabold">
                <td className="pt-3" colSpan={2}>
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
        <p className="text-xs text-muted">
          Before GST. CGST 2.5% + SGST 2.5% are added on the bill.
          {order.notes && <> Notes: {order.notes}</>}
        </p>
      </article>
    </>
  );
}
