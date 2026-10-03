import Link from "next/link";
import { AlertTriangle, ArrowRight, Boxes, ChevronRight, IndianRupee, Layers, PackagePlus, Receipt, Truck } from "lucide-react";
import { requireUser } from "@/lib/session";
import { listBills, listStock } from "@/lib/store/data";
import { formatINR } from "@/lib/money";
import { formatDateTime, istDay } from "@/lib/dates";
import { SET_PCS, qtyLabel } from "@/lib/sets";
import { Card, SectionTitle, Stat } from "@/components/ui";

export const metadata = { title: "Home" };

function greeting(now: Date) {
  const hour = Number(new Intl.DateTimeFormat("en-IN", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Kolkata" }).format(now));
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

export default async function HomePage() {
  const user = await requireUser();
  const [bills, stock] = await Promise.all([listBills(), listStock()]);

  const now = new Date();
  const today = istDay();
  const todayBills = bills.filter((b) => istDay(b.createdAt) === today);
  const todaySales = todayBills.reduce((s, b) => s + b.total, 0);
  const todayPcs = todayBills.reduce((s, b) => s + b.totalPieces, 0);
  const inStock = stock.reduce((s, z) => s + Math.max(0, z.inStock), 0);
  const low = stock.filter((z) => z.inStock < SET_PCS).sort((a, b) => a.inStock - b.inStock);


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
          href="/bills/new"
          className="group relative overflow-hidden rounded-[1.4rem] bg-gradient-to-br from-[#5b52ee] via-[#4f46e5] to-[#3730a3] p-5 text-white shadow-lg shadow-indigo-900/15"
        >
          <span className="pointer-events-none absolute -top-16 -right-10 h-44 w-44 rounded-full bg-white/10" />
          <div className="relative flex items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/25">
              <Receipt size={26} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xl font-extrabold tracking-tight">Bill a customer</p>
              <p className="mt-0.5 text-sm text-white/75">Scan the tag. GST bill from your stock.</p>
            </div>
            <ArrowRight className="shrink-0 transition-transform group-hover:translate-x-0.5" size={22} />
          </div>
        </Link>
        <Link href="/orders/new" className="card group flex items-center gap-4 p-5 transition-colors hover:border-accent">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">
            <PackagePlus size={26} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xl font-extrabold tracking-tight">Order from supplier</p>
            <p className="mt-0.5 text-sm text-muted">Scan their tag. Stock is added.</p>
          </div>
          <ArrowRight className="shrink-0 text-accent transition-transform group-hover:translate-x-0.5" size={22} />
        </Link>
      </div>

      <Link href="/supplier" className="card mt-3 flex items-center gap-3 p-4 transition-colors hover:border-accent">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
          <Truck size={19} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold">Supplier report</span>
          <span className="block truncate text-sm text-muted">What you sold today from each supplier, ready to send</span>
        </span>
        <ChevronRight size={18} className="text-muted" />
      </Link>

      <h2 className="mt-7 mb-3 text-base font-bold">Today</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <div className="col-span-2 lg:col-span-1">
          <Stat icon={IndianRupee} label="Sales" value={formatINR(todaySales)} hint={`${todayBills.length} bill${todayBills.length === 1 ? "" : "s"}`} />
        </div>
        <Stat icon={Layers} label="Sold" value={qtyLabel(todayPcs)} hint={`${todayPcs} pieces`} />
        <Stat icon={Boxes} label="In stock" value={qtyLabel(inStock)} hint={low.length ? `${low.length} running low` : "all well stocked"} />
      </div>

      <div className="mt-7 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section>
          <SectionTitle action={<Link href="/stock" className="text-sm font-bold text-accent">Stock</Link>}>Running low</SectionTitle>
          <Card>
            {low.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted">{stock.length ? "Every item has at least one set in stock." : "Order from a supplier to build your stock."}</p>
            ) : (
              <ul className="divide-y divide-line">
                {low.slice(0, 5).map((z) => (
                  <li key={z.id} className="flex items-center gap-3 px-4 py-3">
                    <AlertTriangle size={18} className={z.inStock <= 0 ? "text-danger" : "text-warn"} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">
                        {z.articleCode} <span className="text-accent">· {z.size}</span>
                      </p>
                      <p className="truncate text-sm text-muted">{z.supplierName}</p>
                    </div>
                    <span className={`text-sm font-bold whitespace-nowrap ${z.inStock <= 0 ? "text-danger" : "text-warn"}`}>{z.inStock <= 0 ? "Out" : qtyLabel(z.inStock)}</span>
                    <Link href={`/orders/new?tag=${z.tagId}`} className="btn btn-soft btn-sm">
                      Reorder
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
