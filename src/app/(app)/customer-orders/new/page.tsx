import { requireUser } from "@/lib/session";
import { listCustomers, listSizes } from "@/lib/store/data";
import { PageHeader } from "@/components/ui";
import { OrderForm } from "./order-form";

export const metadata = { title: "Customer order form" };

export default async function NewCustomerOrderPage() {
  await requireUser();
  const [catalog, customers] = await Promise.all([listSizes(), listCustomers()]);
  return (
    <>
      <PageHeader step={1} back={{ href: "/", label: "Home" }} title="Customer order form" subtitle="Scan the tags, tick what the customer wants, save or bill." />
      <OrderForm catalog={catalog} customers={customers} />
    </>
  );
}
