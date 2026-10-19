import Link from "next/link";
import { ArrowRight, ClipboardList, IndianRupee, Layers, ScanLine } from "lucide-react";
import { requireUser } from "@/lib/session";
import { listBills, listCustomerOrders } from "@/lib/store/data";
import { formatINR } from "@/lib/money";
import { formatDateTime, istDay } from "@/lib/dates";
import { Card, Pill, SectionTitle, Stat } from "@/components/ui";

export const metadata = { title: "Home" };

function greeting(now: Date) {
  const hour = Number(new Intl.DateTimeFormat("en-IN", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Kolkata" }).format(now));
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

export default async function HomePage() {
  const user = await requireUser();
  const [orders, bills] = await Promise.all([listCustomerOrders(), listBills()]);

  const now = new Date();
  const today = istDay();
  const todayOrders = orders.filter((o) => istDay(o.createdAt) === today);
  const todayBills = bills.filter((b) => istDay(b.createdAt) === today);
  const todaySets = todayOrders.reduce((s, o) => s + o.totalSets, 0);
  const todaySales = todayBills.reduce((s, b) => s + b.total, 0);
  const open = orders.filter((o) => o.status === "open");

  return (
    <>
      <div className="mb-5">
        <p className="text-sm font-medium text-muted tnum">{formatDateTime(now)}</p>
        <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight md:text-[1.75rem]">
          {greeting(now)}, {user}
        </h1>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/customer-orders/new"
          className="group relative overflow-hidden rounded-[1.4rem] bg-gradient-to-br from-[#5b52ee] via-[#4f46e5] to-[#3730a3] p-5 text-white shadow-lg shadow-indigo-900/15"
        >
          <span className="pointer-events-none absolute -top-16 -right-10 h-44 w-44 rounded-full bg-white/10" />
          <div className="relative flex items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/25">
              <ScanLine size={26} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xl font-extrabold tracking-tight">Customer order form</p>
              <p className="mt-0.5 text-sm text-white/75">Scan tags, tick, save or bill.</p>
            </div>
            <ArrowRight className="shrink-0 transition-transform group-hover:translate-x-0.5" size={22} />
          </div>
        </Link>
        <Link href={`/compile`} className="card group flex items-center gap-4 p-5 transition-colors hover:border-accent">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">
            <Layers size={26} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xl font-extrabold tracking-tight">Today&apos;s compile</p>
            <p className="mt-0.5 text-sm text-muted">{todaySets ? `${todaySets} sets to order from suppliers` : "What to order from each supplier"}</p>
          </div>
          <ArrowRight className="shrink-0 text-accent transition-transform group-hover:translate-x-0.5" size={22} />
        </Link>
      </div>

      <h2 className="mt-7 mb-3 text-base font-bold">Today</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <div className="col-span-2 lg:col-span-1">
          <Stat icon={IndianRupee} label="Billed" value={formatINR(todaySales)} hint={`${todayBills.length} bill${todayBills.length === 1 ? "" : "s"}`} />
        </div>
        <Stat icon={ClipboardList} label="Orders taken" value={String(todayOrders.length)} hint={`${open.length} not billed`} />
        <Stat icon={Layers} label="Sets ordered" value={`${todaySets}`} hint={`${todayOrders.reduce((s, o) => s + o.totalPieces, 0)} pieces`} />
      </div>

      <div className="mt-7 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section>
          <SectionTitle action={<Link href="/customer-orders?show=open" className="text-sm font-bold text-accent">See all</Link>}>Not billed yet</SectionTitle>
          <Card>
            {open.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted">Every order is billed.</p>
            ) : (
              <ul className="divide-y divide-line">
                {open.slice(0, 5).map((o) => (
                  <li key={o.id} className="flex items-center gap-3 px-4 py-3">
                    <Link href={`/customer-orders/${o.id}`} className="min-w-0 flex-1">
                      <p className="truncate font-bold">{o.customerName}</p>
                      <p className="truncate text-sm text-muted tnum">
                        {o.orderNo} · {o.totalSets} sets · {formatINR(o.totalAmount)}
                      </p>
                    </Link>
                    <Link href={`/bills/new?order=${o.id}`} className="btn btn-soft btn-sm">
                      Bill
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
                      {b.gstMode === "without" && <Pill tone="muted">No GST</Pill>}
                      <span className="font-extrabold tnum">{formatINR(b.total)}</span>
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
