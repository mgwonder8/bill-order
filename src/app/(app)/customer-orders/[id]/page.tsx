import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2, FileText, Pencil } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getCustomerOrder } from "@/lib/store/data";
import { formatINR } from "@/lib/money";
import { formatDate, formatDateTime, formatTime } from "@/lib/dates";
import { shop } from "@/lib/shop";
import { Card, PageHeader, Pill } from "@/components/ui";
import { DocActions } from "@/components/doc-actions";

export const metadata = { title: "Customer order" };

export default async function CustomerOrderPage({ params, searchParams }: PageProps<"/customer-orders/[id]">) {
  await requireUser();
  const { id } = await params;
  const justMade = (await searchParams).new === "1";
  const found = await getCustomerOrder(id);
  if (!found) notFound();
  const { order, items } = found;
  const open = order.status === "open";

  return (
    <>
      <PageHeader
        back={{ href: "/customer-orders", label: "Customer orders" }}
        title={order.customerName}
        subtitle={`${order.orderNo} · ${formatDateTime(order.createdAt)}`}
        action={<Pill tone={open ? "warn" : "ok"}>{open ? "Not billed" : "Billed"}</Pill>}
      />

      {justMade && (
        <div className="no-print rise mb-4 flex items-center gap-3 rounded-2xl bg-ok-soft px-4 py-3 text-ok">
          <CheckCircle2 size={22} className="shrink-0" />
          <p className="font-bold">Order saved. It counts in today&apos;s supplier compile.</p>
        </div>
      )}

      <div className="no-print mb-5 grid gap-3 lg:grid-cols-[1.2fr_1fr]">
        {open ? (
          <Card className="flex flex-col gap-4 border-accent/30 bg-gradient-to-br from-accent-soft to-surface p-5 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="text-lg font-extrabold">Make the bill now?</p>
              <p className="text-sm text-muted tnum">
                {order.totalSets} sets · {order.totalPieces} pcs · {formatINR(order.totalAmount)}
              </p>
            </div>
            <div className="flex gap-2">
              <Link href={`/customer-orders/${order.id}/edit`} className="btn btn-outline" aria-label="Change order">
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
            <p className="min-w-0 flex-1 text-lg font-extrabold">This order is billed</p>
            <Link href={`/bills/${order.billId}`} className="btn btn-primary">
              <FileText size={18} /> Open bill
            </Link>
          </Card>
        )}
        <Card className="p-5">
          <p className="mb-3 font-bold">Send the order form</p>
          <DocActions shop={shop} doc={{ kind: "customerOrder", order, items }} compact />
        </Card>
      </div>

      <article className="print-sheet card mx-auto max-w-4xl p-5 md:p-8">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold tracking-tight">{shop.name}</h2>
            <p className="mt-0.5 max-w-xs text-sm text-muted">{shop.address}</p>
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
          <p className="mt-1 font-bold">{order.customerName}</p>
          <p className="text-sm break-words text-muted">{[order.customerPhone, order.customerGstin && `GSTIN ${order.customerGstin}`, order.customerAddress].filter(Boolean).join(" · ")}</p>
        </section>
        <div className="overflow-x-auto py-4">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-bold uppercase tracking-wide text-muted">
                <th className="pb-2">Article</th>
                <th className="pb-2">Size chart</th>
                <th className="pb-2 text-right">Sets</th>
                <th className="pb-2 text-right">Pcs</th>
                <th className="pb-2 text-right">Rate</th>
                <th className="pb-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              {items.map((i) => (
                <tr key={i.id} className="align-top">
                  <td className="py-2.5">
                    <span className="font-bold">{i.articleCode}</span>
                    {i.brand && <div className="text-xs text-muted">{i.brand}</div>}
                  </td>
                  <td className="py-2.5">
                    {i.size}
                    {i.sizes && i.sizes !== i.size && <div className="text-xs text-muted">{i.sizes.replaceAll("/", ", ")}</div>}
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
        {order.notes && <p className="text-xs text-muted">Note: {order.notes}</p>}
      </article>
    </>
  );
}
