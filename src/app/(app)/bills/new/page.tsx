import Link from "next/link";
import { notFound, redirect } from "next/navigation";
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
        <PageHeader title="Make a bill" subtitle="Bills are made from an order. Pick the order to confirm." />
        {open.length === 0 ? (
          <EmptyState title="No orders waiting" body="Make an order by scanning a tag first." cta={{ href: "/orders/new", label: "New order" }} />
        ) : (
          <Card>
            <ul className="divide-y divide-line">
              {open.map((o) => (
                <li key={o.id}>
                  <Link href={`/bills/new?order=${o.id}`} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-black/[0.02]">
                    <div>
                      <p className="text-lg font-semibold">
                        {o.orderNo} · {o.customerName || "Walk-in"}
                      </p>
                      <p className="text-sm text-muted tnum">{formatDateTime(o.createdAt)}</p>
                    </div>
                    <span className="font-semibold tnum">
                      {o.totalSets} sets = {o.totalPieces} pcs
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
      <div className="no-print mb-4">
        <Link href={`/orders/${orderId}`} className="text-base text-muted hover:text-foreground">
          &larr; Back to order {found.order.orderNo}
        </Link>
      </div>
      <PageHeader
        title={`Make bill for ${found.order.orderNo}`}
        subtitle="Check the customer, add a discount if you want, then confirm. GST: CGST 2.5% + SGST 2.5%."
      />
      <BillClient order={found.order} items={found.items} />
    </>
  );
}
