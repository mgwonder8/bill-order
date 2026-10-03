import Link from "next/link";
import { notFound } from "next/navigation";
import { Boxes, CheckCircle2, Pencil } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getOrder } from "@/lib/store/data";
import { formatINR } from "@/lib/money";
import { formatDate, formatDateTime, formatTime } from "@/lib/dates";
import { shop } from "@/lib/shop";
import { Card, PageHeader } from "@/components/ui";
import { DocActions } from "@/components/doc-actions";

export const metadata = { title: "Supplier order" };

export default async function OrderPage({ params, searchParams }: PageProps<"/orders/[id]">) {
  await requireUser();
  const { id } = await params;
  const justMade = (await searchParams).new === "1";
  const found = await getOrder(id);
  if (!found) notFound();
  const { order, items } = found;

  return (
    <>
      <PageHeader
        back={{ href: "/orders", label: "Supplier orders" }}
        title={order.supplierName}
        subtitle={`${order.orderNo} · ${formatDateTime(order.createdAt)}`}
        action={
          <Link href={`/orders/${order.id}/edit`} className="btn btn-outline btn-sm">
            <Pencil size={16} /> Change
          </Link>
        }
      />

      {justMade && (
        <div className="no-print rise mb-4 flex items-center gap-3 rounded-2xl bg-ok-soft px-4 py-3 text-ok">
          <CheckCircle2 size={22} className="shrink-0" />
          <p className="font-bold">
            Order saved. {order.totalPieces} pcs added to stock.
          </p>
        </div>
      )}

      <div className="no-print mb-5 grid gap-3 lg:grid-cols-[1.2fr_1fr]">
        <Card className="p-5">
          <p className="mb-3 font-bold">Send the order form to the supplier</p>
          <DocActions shop={shop} doc={{ kind: "order", order, items }} print compact />
        </Card>
        <Card className="flex items-center gap-4 p-5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
            <Boxes size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-extrabold tnum">
              {order.totalSets} sets · {order.totalPieces} pcs in stock
            </p>
            <p className="text-sm text-muted">Added when this order was saved.</p>
          </div>
          <Link href="/stock" className="btn btn-soft btn-sm">
            Stock
          </Link>
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
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Purchase order</p>
            <p className="mt-1 text-lg font-extrabold tnum">{order.orderNo}</p>
            <p className="text-sm text-muted tnum">
              {formatDate(order.createdAt)} · {formatTime(order.createdAt)}
            </p>
          </div>
        </header>

        <section className="border-b border-line py-4">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">To supplier</p>
          <p className="mt-1 font-bold">{order.supplierName}</p>
          <p className="text-sm break-words text-muted">
            {[order.supplierPhone, order.supplierGstin ? `GSTIN ${order.supplierGstin}` : "GSTIN not added", order.supplierAddress].filter(Boolean).join(" · ")}
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
                    {i.brand && <div className="text-xs text-muted">{i.brand}</div>}
                  </td>
                  <td className="py-2.5">{i.size}</td>
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
          1 set = 24 pieces. Rates as on your tag.
          {order.notes && <> Note: {order.notes}</>}
        </p>
      </article>
    </>
  );
}
