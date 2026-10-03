import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getOrder, listSizes } from "@/lib/store/data";
import { PageHeader } from "@/components/ui";
import { OrderClient } from "../../new/order-client";

export const metadata = { title: "Change supplier order" };

export default async function EditOrderPage({ params }: PageProps<"/orders/[id]/edit">) {
  await requireUser();
  const { id } = await params;
  const [found, catalog] = await Promise.all([getOrder(id), listSizes()]);
  if (!found) notFound();

  return (
    <>
      <PageHeader back={{ href: `/orders/${id}`, label: `Order ${found.order.orderNo}` }} title="Change supplier order" subtitle="Stock updates when you save." />
      <OrderClient catalog={catalog} initial={found} />
    </>
  );
}
