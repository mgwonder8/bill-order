import { requireUser } from "@/lib/session";
import { listSizes } from "@/lib/store/data";
import { PageHeader } from "@/components/ui";
import { OrderClient } from "./order-client";

export const metadata = { title: "Order from supplier" };

export default async function NewOrderPage({ searchParams }: PageProps<"/orders/new">) {
  await requireUser();
  const tagId = (await searchParams).tag;
  const catalog = await listSizes();
  const preset = typeof tagId === "string" ? catalog.filter((z) => z.tagId === tagId) : [];
  return (
    <>
      <PageHeader step={1} back={{ href: "/", label: "Home" }} title="Order from supplier" subtitle="Scan the supplier's tag. 1 set = 24 pieces." />
      <OrderClient catalog={catalog} preset={preset} />
    </>
  );
}
