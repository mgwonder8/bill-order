import Link from "next/link";
import { Camera, ChevronRight, ClipboardList } from "lucide-react";
import { requireUser } from "@/lib/session";
import { listOrders } from "@/lib/store/data";
import { formatINR } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";
import { Card, EmptyState, PageHeader, Pill } from "@/components/ui";

export const metadata = { title: "Orders" };

const FILTERS = [
  { key: "open", label: "Waiting" },
  { key: "billed", label: "Billed" },
  { key: "all", label: "All" },
] as const;

export default async function OrdersPage({ searchParams }: PageProps<"/orders">) {
  await requireUser();
  const orders = await listOrders();
  const raw = (await searchParams).show;
  const show = FILTERS.some((f) => f.key === raw) ? (raw as (typeof FILTERS)[number]["key"]) : "open";
  const counts = { open: orders.filter((o) => o.status === "open").length, billed: orders.filter((o) => o.status === "billed").length, all: orders.length };
  const shown = show === "all" ? orders : orders.filter((o) => o.status === show);

  const header = (
    <PageHeader
      title="Orders"
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
        <EmptyState icon={ClipboardList} title="No orders yet" body="Scan the tag of what the customer wants. It becomes an order form." cta={{ href: "/orders/new", label: "Scan the first tag" }} />
      </>
    );
  }

  return (
    <>
      {header}
      <div className="mb-4 inline-flex rounded-xl border border-line bg-surface p-1">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "open" ? "/orders" : `/orders?show=${f.key}`}
            className={`rounded-lg px-3.5 py-2 text-sm font-bold transition-colors ${show === f.key ? "bg-accent text-white" : "text-muted hover:text-foreground"}`}
          >
            {f.label} <span className={show === f.key ? "text-white/75" : "text-muted/70"}>{counts[f.key]}</span>
          </Link>
        ))}
      </div>

      {shown.length === 0 ? (
        <Card className="px-5 py-10 text-center text-sm text-muted">{show === "open" ? "No orders waiting for a bill." : "Nothing here yet."}</Card>
      ) : (
        <Card>
          <ul className="divide-y divide-line">
            {shown.map((o) => (
              <li key={o.id}>
                <Link href={`/orders/${o.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-black/[0.015] md:px-5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-sm font-extrabold uppercase text-accent">
                    {(o.customerName || "W").charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{o.customerName || "Walk-in customer"}</p>
                    <p className="truncate text-sm text-muted tnum">
                      {o.orderNo} · {formatDateTime(o.createdAt)}
                    </p>
                  </div>
                  <div className="hidden text-right sm:block">
                    <p className="font-bold tnum">{formatINR(o.totalAmount)}</p>
                    <p className="text-xs text-muted tnum">
                      {o.totalSets} sets · {o.totalPieces} pcs
                    </p>
                  </div>
                  <Pill tone={o.status === "billed" ? "ok" : "warn"}>{o.status === "billed" ? "Billed" : "Waiting"}</Pill>
                  <ChevronRight size={18} className="hidden text-muted sm:block" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
