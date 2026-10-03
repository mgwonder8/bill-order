import Link from "next/link";
import { ArrowRight, Camera, ChevronRight, ClipboardList, FileText, IndianRupee, Layers, Truck } from "lucide-react";
import { requireUser } from "@/lib/session";
import { listBills, listOrders, listTags } from "@/lib/store/data";
import { formatINR } from "@/lib/money";
import { formatDateTime, istDay } from "@/lib/dates";
import { Card, SectionTitle, Stat } from "@/components/ui";

export const metadata = { title: "Home" };

function greeting(now: Date) {
  const hour = Number(new Intl.DateTimeFormat("en-IN", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Kolkata" }).format(now));
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

export default async function HomePage() {
  const user = await requireUser();
  const [bills, orders, tags] = await Promise.all([listBills(), listOrders(), listTags()]);

  const now = new Date();
  const today = istDay();
  const todayBills = bills.filter((b) => istDay(b.createdAt) === today);
  const openOrders = orders.filter((o) => o.status === "open");
  const todaySales = todayBills.reduce((s, b) => s + b.total, 0);
  const todaySets = todayBills.reduce((s, b) => s + b.totalSets, 0);
  const todayPcs = todayBills.reduce((s, b) => s + b.totalPieces, 0);

  const flow = [
    { n: 1, href: "/orders/new", icon: Camera, title: "Scan & order", note: `${tags.length} tag${tags.length === 1 ? "" : "s"} saved` },
    { n: 2, href: "/bills/new", icon: FileText, title: "Make bill", note: openOrders.length ? `${openOrders.length} waiting` : "All billed" },
    { n: 3, href: "/supplier", icon: Truck, title: "Supplier report", note: `${todayBills.length} bill${todayBills.length === 1 ? "" : "s"} today` },
  ];

  return (
    <>
      <div className="mb-5">
        <p className="text-sm font-medium text-muted tnum">{formatDateTime(now)}</p>
        <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight md:text-[1.75rem]">
          {greeting(now)}, {user}
        </h1>
      </div>

      <Link
        href="/orders/new"
        className="group relative block overflow-hidden rounded-[1.4rem] bg-gradient-to-br from-[#5b52ee] via-[#4f46e5] to-[#3730a3] p-5 text-white shadow-lg shadow-indigo-900/15 md:p-7"
      >
        <span className="pointer-events-none absolute -top-16 -right-10 h-48 w-48 rounded-full bg-white/10" />
        <span className="pointer-events-none absolute -bottom-20 right-24 h-40 w-40 rounded-full bg-white/5" />
        <div className="relative flex items-center gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/25 md:h-16 md:w-16">
            <Camera size={28} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xl font-extrabold tracking-tight md:text-2xl">Scan a tag</p>
            <p className="mt-0.5 text-sm text-white/75 md:text-base">Take a photo. Sizes and rates fill in by themselves.</p>
          </div>
          <span className="hidden items-center gap-1.5 rounded-xl bg-white px-4 py-3 font-bold text-accent sm:inline-flex">
            Start <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
          </span>
          <ArrowRight className="shrink-0 sm:hidden" size={22} />
        </div>
      </Link>

      <ol className="mt-4 grid grid-cols-3 gap-2 md:gap-3">
        {flow.map(({ n, href, icon: Icon, title, note }) => (
          <li key={n}>
            <Link href={href} className="card flex h-full flex-col gap-2 p-3 transition-colors hover:border-accent md:flex-row md:items-center md:gap-3 md:p-4">
              <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                <Icon size={19} />
                <span className="absolute -top-1.5 -left-1.5 grid h-5 w-5 place-items-center rounded-full bg-accent text-[0.65rem] font-bold text-white ring-2 ring-surface">
                  {n}
                </span>
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold leading-tight md:text-[0.95rem]">{title}</span>
                <span className="block truncate text-xs text-muted">{note}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>

      <h2 className="mt-7 mb-3 text-base font-bold">Today</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <div className="col-span-2 lg:col-span-1">
          <Stat icon={IndianRupee} label="Sales" value={formatINR(todaySales)} hint={`${todayBills.length} bill${todayBills.length === 1 ? "" : "s"}`} />
        </div>
        <Stat icon={Layers} label="Sold" value={`${todaySets} sets`} hint={`${todayPcs} pieces`} />
        <Stat icon={ClipboardList} label="Waiting for bill" value={String(openOrders.length)} hint={openOrders.length ? "orders to confirm" : "nothing pending"} />
      </div>

      <div className="mt-7 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section>
          <SectionTitle action={<Link href="/orders" className="text-sm font-bold text-accent">See all</Link>}>Waiting for bill</SectionTitle>
          <Card>
            {openOrders.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted">No orders waiting. Nice work!</p>
            ) : (
              <ul className="divide-y divide-line">
                {openOrders.slice(0, 5).map((o) => (
                  <li key={o.id} className="flex items-center gap-3 px-4 py-3">
                    <Link href={`/orders/${o.id}`} className="min-w-0 flex-1">
                      <p className="truncate font-bold">{o.customerName || "Walk-in customer"}</p>
                      <p className="truncate text-sm text-muted tnum">
                        {o.orderNo} · {o.totalSets} sets · {formatINR(o.totalAmount)}
                      </p>
                    </Link>
                    <Link href={`/bills/new?order=${o.id}`} className="btn btn-soft btn-sm">
                      Make bill
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>

        <section>
          <SectionTitle action={<Link href="/bills" className="text-sm font-bold text-accent">See all</Link>}>Recent bills</SectionTitle>
          <Card>
            {bills.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted">Bills you make will show up here.</p>
            ) : (
              <ul className="divide-y divide-line">
                {bills.slice(0, 5).map((b) => (
                  <li key={b.id}>
                    <Link href={`/bills/${b.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-black/[0.015]">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold">{b.customerName}</p>
                        <p className="truncate text-sm text-muted tnum">
                          {b.billNo} · {formatDateTime(b.createdAt)}
                        </p>
                      </div>
                      <span className="font-extrabold tnum">{formatINR(b.total)}</span>
                      <ChevronRight size={18} className="text-muted" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>
      </div>
    </>
  );
}
