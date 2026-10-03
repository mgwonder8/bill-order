import Link from "next/link";
import { Camera, ChevronRight, ClipboardList } from "lucide-react";
import { requireUser } from "@/lib/session";
import { listOrders } from "@/lib/store/data";
import { formatINR } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";
import { Card, EmptyState, PageHeader } from "@/components/ui";

export const metadata = { title: "Supplier orders" };

export default async function OrdersPage() {
  await requireUser();
  const orders = await listOrders();

  const header = (
    <PageHeader
      title="Supplier orders"
      subtitle={orders.length ? `${orders.length} order${orders.length === 1 ? "" : "s"} · stock is added when an order is saved` : undefined}
      action={
        <Link href="/orders/new" className="btn btn-primary">
          <Camera size={18} /> New order
        </Link>
      }
    />
  );

  if (orders.length === 0) {
    return (
      <>
        {header}
        <EmptyState icon={ClipboardList} title="No supplier orders yet" body="Scan a supplier's tag to order sets. Saving the order adds the stock." cta={{ href: "/orders/new", label: "Scan a tag" }} />
      </>
    );
  }

  return (
    <>
      {header}
      <Card>
        <ul className="divide-y divide-line">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/orders/${o.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-black/[0.015] md:px-5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-sm font-extrabold uppercase text-accent">
                  {o.supplierName.charAt(0) || "S"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{o.supplierName}</p>
                  <p className="truncate text-sm text-muted tnum">
                    {o.orderNo} · {formatDateTime(o.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold tnum">{o.totalSets} sets</p>
                  <p className="text-xs text-muted tnum">{formatINR(o.totalAmount)}</p>
                </div>
                <ChevronRight size={18} className="hidden text-muted sm:block" />
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
