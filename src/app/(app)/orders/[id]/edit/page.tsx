import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getOrder, listSizes } from "@/lib/store/data";
import { PageHeader } from "@/components/ui";
import { OrderClient } from "../../new/order-client";

export const metadata = { title: "Change order" };

export default async function EditOrderPage({ params }: PageProps<"/orders/[id]/edit">) {
  await requireUser();
  const { id } = await params;
  const [found, catalog] = await Promise.all([getOrder(id), listSizes()]);
  if (!found) notFound();
  if (found.order.status === "billed") redirect(`/orders/${id}`);

  return (
    <>
      <PageHeader step={2} title={`Change order ${found.order.orderNo}`} subtitle="Scan more tags, change quantities, then save." />
      <OrderClient catalog={catalog} initial={found} />
    </>
  );
}
