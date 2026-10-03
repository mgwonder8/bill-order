import Link from "next/link";
import { ArrowRight, ClipboardList, ScanLine, Truck } from "lucide-react";
import { requireUser } from "@/lib/session";
import { listBills, listOrders, listTags } from "@/lib/store/data";
import { formatINR } from "@/lib/money";
import { formatDateTime, istDay } from "@/lib/dates";
import { Card, Pill, Stat, StepBadge } from "@/components/ui";

export const metadata = { title: "Home" };

const STEPS = [
  {
    n: 1,
    href: "/orders/new",
    icon: ScanLine,
    title: "Scan tag & make order",
    body: "Take a photo of the supplier tag. It is saved and added to the order form. Share the order form.",
  },
  {
    n: 2,
    href: "/orders",
    icon: ClipboardList,
    title: "Confirm & make bill",
    body: "Open the order, add a discount if needed, and make the GST bill. Send or download it.",
  },
  {
    n: 3,
    href: "/supplier",
    icon: Truck,
    title: "Send supplier report",
    body: "At the end of the day, send each supplier everything sold today.",
  },
];

export default async function HomePage() {
  const user = await requireUser();
  const [bills, orders, tags] = await Promise.all([listBills(), listOrders(), listTags()]);

  const today = istDay();
  const todayBills = bills.filter((b) => istDay(b.createdAt) === today);
  const todayOrders = orders.filter((o) => istDay(o.createdAt) === today);
  const openOrders = orders.filter((o) => o.status === "open");
  const todaySales = todayBills.reduce((s, b) => s + b.total, 0);
  const todaySets = todayBills.reduce((s, b) => s + b.totalSets, 0);
  const todayPcs = todayBills.reduce((s, b) => s + b.totalPieces, 0);

  return (
    <>
      <div className="mb-6">
        <p className="text-base text-muted tnum">{formatDateTime(new Date())}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">Hello, {user}</h1>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {STEPS.map(({ n, href, icon: Icon, title, body }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col rounded-2xl border-2 border-line bg-surface p-5 shadow-sm transition-colors hover:border-accent"
          >
            <div className="flex items-center justify-between">
              <StepBadge n={n} small />
              <Icon size={26} className="text-accent" strokeWidth={1.8} />
            </div>
            <p className="mt-3 text-lg font-bold">{title}</p>
            <p className="mt-1 flex-1 text-base text-muted">{body}</p>
            <span className="mt-4 inline-flex items-center gap-1.5 font-semibold text-accent">
              Start <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>

      <h2 className="mt-8 mb-3 text-lg font-bold">Today</h2>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat label="Sales today" value={formatINR(todaySales)} hint={`${todayBills.length} bill${todayBills.length === 1 ? "" : "s"}`} />
        <Stat label="Sold today" value={`${todaySets} sets`} hint={`${todayPcs} pieces`} />
        <Stat label="Orders today" value={String(todayOrders.length)} hint={`${openOrders.length} waiting for bill`} />
        <Stat label="Tags saved" value={String(tags.length)} hint="Articles saved from tags" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Orders waiting for bill</h2>
            <Link href="/orders" className="text-sm font-semibold text-accent hover:underline">
              All orders
            </Link>
          </div>
          {openOrders.length === 0 ? (
            <p className="py-8 text-center text-base text-muted">No orders waiting.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {openOrders.slice(0, 6).map((o) => (
                <li key={o.id}>
                  <Link href={`/orders/${o.id}`} className="flex items-center gap-3 py-3 hover:text-accent">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-semibold">
                        {o.orderNo} · {o.customerName || "Walk-in"}
                      </p>
                      <p className="text-sm text-muted tnum">
                        {formatDateTime(o.createdAt)} · {o.totalSets} sets = {o.totalPieces} pcs
                      </p>
                    </div>
                    <Pill tone="warn">Make bill</Pill>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Latest bills</h2>
            <Link href="/bills" className="text-sm font-semibold text-accent hover:underline">
              All bills
            </Link>
          </div>
          {bills.length === 0 ? (
            <p className="py-8 text-center text-base text-muted">No bills yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {bills.slice(0, 6).map((b) => (
                <li key={b.id}>
                  <Link href={`/bills/${b.id}`} className="flex items-center gap-3 py-3 hover:text-accent">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-semibold">
                        {b.billNo} · {b.customerName}
                      </p>
                      <p className="text-sm text-muted tnum">{formatDateTime(b.createdAt)}</p>
                    </div>
                    <span className="text-base font-bold tnum">{formatINR(b.total)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
