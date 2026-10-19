import Link from "next/link";
import { ChevronRight, ClipboardList, Plus } from "lucide-react";
import { requireUser } from "@/lib/session";
import { listCustomerOrders } from "@/lib/store/data";
import { formatINR } from "@/lib/money";
import { formatDate, formatTime, istDay, shiftDay } from "@/lib/dates";
import type { CustomerOrder } from "@/lib/types";
import { Card, EmptyState, PageHeader, Pill } from "@/components/ui";

export const metadata = { title: "Customer orders" };

const FILTERS = [
  { key: "all", label: "All" },
  { key: "open", label: "Not billed" },
  { key: "billed", label: "Billed" },
] as const;

export default async function CustomerOrdersPage({ searchParams }: PageProps<"/customer-orders">) {
  await requireUser();
  const orders = await listCustomerOrders();
  const raw = (await searchParams).show;
  const show = FILTERS.some((f) => f.key === raw) ? (raw as (typeof FILTERS)[number]["key"]) : "all";
  const counts = { all: orders.length, open: orders.filter((o) => o.status === "open").length, billed: orders.filter((o) => o.status === "billed").length };
  const shown = show === "all" ? orders : orders.filter((o) => o.status === show);

  const header = (
    <PageHeader
      title="Customer orders"
      action={
        <Link href="/customer-orders/new" className="btn btn-primary">
          <Plus size={18} /> New order form
        </Link>
      }
    />
  );

  if (orders.length === 0) {
    return (
      <>
        {header}
        <EmptyState icon={ClipboardList} title="No customer orders yet" body="Scan the tags a customer wants to make their order form." cta={{ href: "/customer-orders/new", label: "New order form" }} />
      </>
    );
  }

  const today = istDay();
  const yesterday = shiftDay(today, -1);
  const groups = new Map<string, CustomerOrder[]>();
  for (const o of shown) groups.set(istDay(o.createdAt), [...(groups.get(istDay(o.createdAt)) ?? []), o]);
  const dayLabel = (d: string) => (d === today ? "Today" : d === yesterday ? "Yesterday" : formatDate(d));

  return (
    <>
      {header}
      <div className="mb-4 inline-flex rounded-xl border border-line bg-surface p-1">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? "/customer-orders" : `/customer-orders?show=${f.key}`}
            className={`rounded-lg px-3.5 py-2 text-sm font-bold ${show === f.key ? "bg-accent text-white" : "text-muted hover:text-foreground"}`}
          >
            {f.label} <span className={show === f.key ? "text-white/75" : "text-muted/70"}>{counts[f.key]}</span>
          </Link>
        ))}
      </div>

      {shown.length === 0 ? (
        <Card className="px-5 py-10 text-center text-sm text-muted">Nothing here.</Card>
      ) : (
        <div className="space-y-6">
          {[...groups.entries()].map(([day, list]) => (
            <section key={day}>
              <div className="mb-2 flex items-baseline justify-between px-1">
                <h2 className="text-sm font-bold">{dayLabel(day)}</h2>
                <Link href={`/compile?date=${day}`} className="text-sm font-bold text-accent">
                  Compile {list.reduce((s, o) => s + o.totalSets, 0)} sets
                </Link>
              </div>
              <Card>
                <ul className="divide-y divide-line">
                  {list.map((o) => (
                    <li key={o.id}>
                      <Link href={`/customer-orders/${o.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-black/[0.015] md:px-5">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-sm font-extrabold uppercase text-accent">{o.customerName.charAt(0) || "C"}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold">{o.customerName}</p>
                          <p className="truncate text-sm text-muted tnum">
                            {o.orderNo} · {formatTime(o.createdAt)} · {o.totalSets} sets
                          </p>
                        </div>
                        <div className="hidden text-right sm:block">
                          <p className="font-bold tnum">{formatINR(o.totalAmount)}</p>
                        </div>
                        <Pill tone={o.status === "billed" ? "ok" : "warn"}>{o.status === "billed" ? "Billed" : "Not billed"}</Pill>
                        <ChevronRight size={18} className="hidden text-muted sm:block" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
