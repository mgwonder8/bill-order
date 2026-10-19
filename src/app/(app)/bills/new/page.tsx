import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronRight, ClipboardList } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getCustomerOrder, listCustomerOrders } from "@/lib/store/data";
import { formatDateTime } from "@/lib/dates";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { BillClient } from "./bill-client";

export const metadata = { title: "Make bill" };

export default async function NewBillPage({ searchParams }: PageProps<"/bills/new">) {
  await requireUser();
  const orderId = (await searchParams).order;

  if (typeof orderId !== "string" || !orderId) {
    const open = (await listCustomerOrders()).filter((o) => o.status === "open");
    return (
      <>
        <PageHeader step={2} back={{ href: "/", label: "Home" }} title="Make a bill" subtitle="Bills are made from a saved customer order form." />
        {open.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No orders waiting for a bill" body="Make a customer order form first." cta={{ href: "/customer-orders/new", label: "New order form" }} />
        ) : (
          <Card>
            <ul className="divide-y divide-line">
              {open.map((o) => (
                <li key={o.id}>
                  <Link href={`/bills/new?order=${o.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-black/[0.015] md:px-5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{o.customerName}</p>
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

  const found = await getCustomerOrder(orderId);
  if (!found) notFound();
  if (found.order.status === "billed") redirect(`/bills/${found.order.billId}`);

  return (
    <>
      <PageHeader step={2} back={{ href: `/customer-orders/${orderId}`, label: `Order ${found.order.orderNo}` }} title="Make the bill" subtitle="Choose with or without GST, add a discount if you want, then confirm." />
      <BillClient order={found.order} items={found.items} />
    </>
  );
}
