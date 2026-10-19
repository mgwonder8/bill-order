import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getCustomerOrder, listCustomers, listSizes } from "@/lib/store/data";
import { PageHeader } from "@/components/ui";
import { OrderForm } from "../../new/order-form";

export const metadata = { title: "Change customer order" };

export default async function EditCustomerOrderPage({ params }: PageProps<"/customer-orders/[id]/edit">) {
  await requireUser();
  const { id } = await params;
  const [found, catalog, customers] = await Promise.all([getCustomerOrder(id), listSizes(), listCustomers()]);
  if (!found) notFound();
  if (found.order.status === "billed") redirect(`/customer-orders/${id}`);
  return (
    <>
      <PageHeader back={{ href: `/customer-orders/${id}`, label: `Order ${found.order.orderNo}` }} title="Change order" subtitle="Scan more tags or change sets, pieces and prices." />
      <OrderForm catalog={catalog} customers={customers} initial={found} />
    </>
  );
}
