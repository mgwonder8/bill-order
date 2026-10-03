import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/session";
import { listOrders } from "@/lib/store/data";
import { formatINR } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";
import { Card, EmptyState, PageHeader, Pill, PrimaryLink } from "@/components/ui";

export const metadata = { title: "Orders" };

export default async function OrdersPage() {
  await requireUser();
  const orders = await listOrders();

  const header = (
    <PageHeader
      title="Orders"
      subtitle="Order forms made by scanning tags."
      action={
        <PrimaryLink href="/orders/new">
          <Plus size={18} /> New order
        </PrimaryLink>
      }
    />
  );

  if (orders.length === 0) {
    return (
      <>
        {header}
        <EmptyState
          title="No orders yet"
          body="Start a new order and take a photo of the tag on the garment the customer wants."
          cta={{ href: "/orders/new", label: "Make the first order" }}
        />
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
              <Link href={`/orders/${o.id}`} className="flex flex-wrap items-center gap-3 px-4 py-3.5 hover:bg-black/[0.02] md:px-5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-semibold">
                    {o.orderNo} · {o.customerName || "Walk-in"}
                  </p>
                  <p className="text-sm text-muted tnum">{formatDateTime(o.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold tnum">
                    {o.totalSets} sets = {o.totalPieces} pcs
                  </p>
                  <p className="text-sm text-muted tnum">{formatINR(o.totalAmount)}</p>
                </div>
                <Pill tone={o.status === "billed" ? "ok" : "warn"}>{o.status === "billed" ? "Billed" : "Waiting for bill"}</Pill>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
