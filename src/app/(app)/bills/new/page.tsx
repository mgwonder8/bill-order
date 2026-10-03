import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronRight, FileText } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getOrder, listOrders } from "@/lib/store/data";
import { formatDateTime } from "@/lib/dates";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { BillClient } from "./bill-client";

export const metadata = { title: "Make bill" };

export default async function NewBillPage({ searchParams }: PageProps<"/bills/new">) {
  await requireUser();
  const orderId = (await searchParams).order;

  if (typeof orderId !== "string" || !orderId) {
    const open = (await listOrders()).filter((o) => o.status === "open");
    return (
      <>
        <PageHeader step={2} back={{ href: "/", label: "Home" }} title="Make a bill" subtitle="Pick the order the customer agreed to." />
        {open.length === 0 ? (
          <EmptyState icon={FileText} title="No orders waiting" body="Scan a tag to make an order first." cta={{ href: "/orders/new", label: "Scan a tag" }} />
        ) : (
          <Card>
            <ul className="divide-y divide-line">
              {open.map((o) => (
                <li key={o.id}>
                  <Link href={`/bills/new?order=${o.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-black/[0.015] md:px-5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{o.customerName || "Walk-in customer"}</p>
                      <p className="truncate text-sm text-muted tnum">
                        {o.orderNo} · {formatDateTime(o.createdAt)} · {o.totalSets} sets
                      </p>
                    </div>
                    <span className="btn btn-soft btn-sm">
                      Bill <ChevronRight size={16} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </>
    );
  }

  const found = await getOrder(orderId);
  if (!found) notFound();
  if (found.order.status === "billed") redirect(`/bills/${found.order.billId}`);

  return (
    <>
      <PageHeader
        step={2}
        back={{ href: `/orders/${orderId}`, label: `Order ${found.order.orderNo}` }}
        title="Make the bill"
        subtitle="Add a discount if you want, then confirm. GST is CGST 2.5% + SGST 2.5%."
      />
      <BillClient order={found.order} items={found.items} />
    </>
  );
}
