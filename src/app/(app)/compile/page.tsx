import Link from "next/link";
import { Truck } from "lucide-react";
import { requireUser } from "@/lib/session";
import { compileDay } from "@/lib/store/data";
import { formatDate, istDay, shiftDay } from "@/lib/dates";
import { shop } from "@/lib/shop";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { CompileClient } from "./compile-client";

export const metadata = { title: "Supplier compile" };

export default async function CompilePage({ searchParams }: PageProps<"/compile">) {
  await requireUser();
  const raw = (await searchParams).date;
  const today = istDay();
  const day = typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : today;
  const yesterday = shiftDay(today, -1);
  const compiledAt = new Date().toISOString();
  const { suppliers, orders } = await compileDay(day);
  const chip = (active: boolean) => `rounded-lg px-3.5 py-2 text-sm font-bold transition-colors ${active ? "bg-accent text-white" : "text-muted hover:text-foreground"}`;
  const totalSets = suppliers.reduce((s, x) => s + x.totalSets, 0);
  const totalPieces = suppliers.reduce((s, x) => s + x.totalPieces, 0);

  return (
    <>
      <PageHeader step={3} title="Supplier compile" subtitle="Everything customers ordered in a day: what to order from each supplier." />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl border border-line bg-surface p-1">
          <Link href="/compile" className={chip(day === today)}>
            Today
          </Link>
          <Link href={`/compile?date=${yesterday}`} className={chip(day === yesterday)}>
            Yesterday
          </Link>
        </div>
        <form method="get" className="flex items-center gap-2">
          <input aria-label="Pick a date" name="date" type="date" defaultValue={day} max={today} className="field h-11 min-h-0 w-auto py-1.5" />
          <button type="submit" className="btn btn-outline btn-sm h-11">
            Show
          </button>
        </form>
      </div>

      <div className="mb-5 grid grid-cols-3 gap-2 md:gap-3">
        <Summary label={day === today ? "Today" : formatDate(day)} value={`${orders.length} order${orders.length === 1 ? "" : "s"}`} />
        <Summary label="To order" value={`${totalSets} sets`} hint={`${totalPieces} pcs`} />
        <Summary label="Suppliers" value={String(suppliers.length)} />
      </div>

      {suppliers.length === 0 ? (
        <EmptyState icon={Truck} title={`No customer orders on ${formatDate(day)}`} body="Customer order forms taken on this day are compiled here, supplier by supplier." cta={{ href: "/customer-orders/new", label: "New order form" }} />
      ) : (
        <CompileClient shop={shop} day={day} compiledAt={compiledAt} suppliers={suppliers} orders={orders} />
      )}
    </>
  );
}

function Summary({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="px-3 py-2.5 md:px-4 md:py-3">
      <p className="truncate text-xs font-semibold text-muted">{label}</p>
      <p className="truncate font-extrabold tnum">{value}</p>
      {hint && <p className="text-xs text-muted tnum">{hint}</p>}
    </Card>
  );
}
