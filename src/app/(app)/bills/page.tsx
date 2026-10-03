import Link from "next/link";
import { ChevronRight, FileText } from "lucide-react";
import { requireUser } from "@/lib/session";
import { listBills } from "@/lib/store/data";
import { formatINR } from "@/lib/money";
import { formatDate, formatTime, istDay, shiftDay } from "@/lib/dates";
import type { Bill } from "@/lib/types";
import { qtyLabel } from "@/lib/sets";
import { Card, EmptyState, PageHeader } from "@/components/ui";

export const metadata = { title: "Bills" };

export default async function BillsPage() {
  await requireUser();
  const bills = await listBills();

  if (bills.length === 0) {
    return (
      <>
        <PageHeader title="Customer bills" />
        <EmptyState icon={FileText} title="No bills yet" body="Scan the tag of what a customer buys to make a GST bill from your stock." cta={{ href: "/bills/new", label: "Bill a customer" }} />
      </>
    );
  }

  const today = istDay();
  const yesterday = shiftDay(today, -1);
  const groups = new Map<string, Bill[]>();
  for (const b of bills) {
    const day = istDay(b.createdAt);
    groups.set(day, [...(groups.get(day) ?? []), b]);
  }
  const dayLabel = (d: string) => (d === today ? "Today" : d === yesterday ? "Yesterday" : formatDate(d));

  return (
    <>
      <PageHeader title="Customer bills" subtitle={`${bills.length} bill${bills.length === 1 ? "" : "s"} saved`} />
      <div className="space-y-6">
        {[...groups.entries()].map(([day, list]) => (
          <section key={day}>
            <div className="mb-2 flex items-baseline justify-between px-1">
              <h2 className="text-sm font-bold">{dayLabel(day)}</h2>
              <p className="text-sm font-semibold text-muted tnum">{formatINR(list.reduce((s, b) => s + b.total, 0))}</p>
            </div>
            <Card>
              <ul className="divide-y divide-line">
                {list.map((b) => (
                  <li key={b.id}>
                    <Link href={`/bills/${b.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-black/[0.015] md:px-5">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ok-soft text-ok">
                        <FileText size={18} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold">{b.customerName}</p>
                        <p className="truncate text-sm text-muted tnum">
                          {b.billNo} · {formatTime(b.createdAt)} · {qtyLabel(b.totalPieces)}
                        </p>
                      </div>
                      <p className="font-extrabold tnum">{formatINR(b.total)}</p>
                      <ChevronRight size={18} className="text-muted" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        ))}
      </div>
    </>
  );
}
