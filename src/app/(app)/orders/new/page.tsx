import { requireUser } from "@/lib/session";
import { compileDay, listSizes } from "@/lib/store/data";
import { formatDate } from "@/lib/dates";
import { PageHeader } from "@/components/ui";
import { OrderClient } from "./order-client";

export const metadata = { title: "Order from supplier" };

export default async function NewOrderPage({ searchParams }: PageProps<"/orders/new">) {
  await requireUser();
  const sp = await searchParams;
  const catalog = await listSizes();

  // Pre-fill from a tag, or from one supplier's lines in the day's compile.
  let preset = typeof sp.tag === "string" ? catalog.filter((z) => z.tagId === sp.tag) : [];
  const presetSets: Record<string, number> = {};
  let from = "";
  if (typeof sp.day === "string" && typeof sp.supplier === "string") {
    const { suppliers } = await compileDay(sp.day);
    const sup = suppliers.find((s) => s.supplierName.toUpperCase() === String(sp.supplier).toUpperCase());
    if (sup) {
      for (const b of sup.brands) for (const l of b.lines) if (l.sizeId) presetSets[l.sizeId] = (presetSets[l.sizeId] ?? 0) + l.sets;
      preset = catalog.filter((z) => presetSets[z.id]);
      from = `From the ${formatDate(sp.day)} compile: ${sup.totalSets} sets for ${sup.supplierName}. Adjust and save.`;
    }
  }

  return (
    <>
      <PageHeader back={{ href: from ? `/compile?date=${sp.day}` : "/", label: from ? "Compile" : "Home" }} title="Order from supplier" subtitle={from || "Scan the supplier's tag. 1 set = 24 pieces."} />
      <OrderClient catalog={catalog} preset={preset} presetSets={presetSets} />
    </>
  );
}
