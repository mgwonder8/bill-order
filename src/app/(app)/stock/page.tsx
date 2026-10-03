import Link from "next/link";
import { Boxes, Camera } from "lucide-react";
import { requireUser } from "@/lib/session";
import { listStock } from "@/lib/store/data";
import { EmptyState, PageHeader } from "@/components/ui";
import { StockClient } from "./stock-client";

export const metadata = { title: "Stock" };

export default async function StockPage() {
  await requireUser();
  const stock = await listStock();

  const header = (
    <PageHeader
      title="Stock"
      subtitle="Pieces ordered from suppliers minus pieces billed. 1 set = 24 pcs."
      action={
        <Link href="/tags" className="btn btn-outline btn-sm">
          Saved tags
        </Link>
      }
    />
  );

  if (stock.length === 0) {
    return (
      <>
        {header}
        <EmptyState icon={Boxes} title="No stock yet" body="Order sets from a supplier by scanning their tag. Saving the order adds the stock here." cta={{ href: "/orders/new", label: "Order from supplier" }} />
        <div className="mt-4 text-center">
          <Link href="/orders/new" className="inline-flex items-center gap-1.5 text-sm font-bold text-accent">
            <Camera size={16} /> Scan a supplier tag
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      {header}
      <StockClient stock={stock} />
    </>
  );
}
