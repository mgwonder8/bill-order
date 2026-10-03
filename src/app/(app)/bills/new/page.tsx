import { requireUser } from "@/lib/session";
import { listCustomers, listStock } from "@/lib/store/data";
import { PageHeader } from "@/components/ui";
import { BillClient } from "./bill-client";

export const metadata = { title: "Bill a customer" };

export default async function NewBillPage() {
  await requireUser();
  const [stock, customers] = await Promise.all([listStock(), listCustomers()]);
  return (
    <>
      <PageHeader step={2} back={{ href: "/", label: "Home" }} title="Bill a customer" subtitle="Scan the tag, enter sets or pieces, then make the GST bill." />
      <BillClient stock={stock} customers={customers} />
    </>
  );
}
