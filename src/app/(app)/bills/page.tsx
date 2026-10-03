import Link from "next/link";
import { requireUser } from "@/lib/session";
import { listBills } from "@/lib/store/data";
import { formatINR } from "@/lib/money";
import { formatDateTime, istDay } from "@/lib/dates";
import { Card, EmptyState, PageHeader } from "@/components/ui";

export const metadata = { title: "Bills" };

export default async function BillsPage() {
  await requireUser();
  const bills = await listBills();

  if (bills.length === 0) {
    return (
      <>
        <PageHeader title="Bills" subtitle="Every GST bill, saved with date and time." />
        <EmptyState
          title="No bills yet"
          body="Bills are made by confirming an order. Make an order by scanning a tag."
          cta={{ href: "/orders/new", label: "New order" }}
        />
      </>
    );
  }

  const today = istDay();
  const todayTotal = bills.filter((b) => istDay(b.createdAt) === today).reduce((s, b) => s + b.total, 0);

  return (
    <>
      <PageHeader title="Bills" subtitle={`${bills.length} bills saved · ${formatINR(todayTotal)} billed today`} />
      <Card>
        <ul className="divide-y divide-line">
          {bills.map((b) => (
            <li key={b.id}>
              <Link href={`/bills/${b.id}`} className="flex flex-wrap items-center gap-3 px-4 py-3.5 hover:bg-black/[0.02] md:px-5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-semibold">
                    {b.billNo} · {b.customerName}
                  </p>
                  <p className="text-sm text-muted tnum">
                    {formatDateTime(b.createdAt)} · {b.totalSets} sets = {b.totalPieces} pcs
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold tnum">{formatINR(b.total)}</p>
                  <p className="text-xs text-muted tnum">GST {formatINR(b.cgstAmount + b.sgstAmount)}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
