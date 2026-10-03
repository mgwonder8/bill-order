import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, ClipboardList, Tag as TagIcon } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getTag } from "@/lib/store/data";
import { formatINR } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";
import { qtyLabel } from "@/lib/sets";
import { Card, PageHeader } from "@/components/ui";

export const metadata = { title: "Saved tag" };

export default async function TagPage({ params, searchParams }: PageProps<"/tags/[id]">) {
  await requireUser();
  const { id } = await params;
  const justSaved = (await searchParams).new === "1";
  const found = await getTag(id);
  if (!found) notFound();
  const { tag, sizes } = found;

  const details: [string, string][] = [
    ["Brand", tag.brand],
    ["Fabric", [tag.fabric, tag.gsm && `${tag.gsm} GSM`].filter(Boolean).join(", ")],
    ["Colour", tag.color],
    ["Supplier GST no.", tag.supplierGstin || "Not added"],
    ["Supplier phone", tag.supplierPhone],
    ["Supplier address", tag.supplierAddress],
    ["Saved", `${formatDateTime(tag.createdAt)} by ${tag.createdBy}`],
  ];

  return (
    <>
      <PageHeader
        back={{ href: "/tags", label: "Saved tags" }}
        title={tag.designNo}
        subtitle={tag.supplierName}
        action={
          <Link href={`/orders/new?tag=${tag.id}`} className="btn btn-primary">
            <ClipboardList size={18} /> Order from supplier
          </Link>
        }
      />

      {justSaved && (
        <div className="rise mb-5 flex items-center gap-3 rounded-2xl bg-ok-soft px-4 py-3 text-ok">
          <CheckCircle2 size={22} />
          <p className="font-bold">Tag saved.</p>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-[200px_1fr]">
        {tag.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={tag.imageUrl} alt="Tag photo" className="w-full max-w-[200px] rounded-2xl border border-line bg-surface object-cover" />
        ) : (
          <div className="grid aspect-[3/4] w-full max-w-[200px] place-items-center rounded-2xl border border-line bg-surface">
            <TagIcon className="text-muted" size={32} />
          </div>
        )}
        <div className="space-y-5">
          <Card className="overflow-hidden">
            <p className="border-b border-line px-5 py-3 font-bold">Sizes, rates and stock</p>
            <ul className="divide-y divide-line">
              {sizes.map((z) => (
                <li key={z.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                  <span>
                    <b>{z.size}</b> <span className="text-sm text-muted">({z.sizes.replaceAll("/", ", ")})</span>
                    <span className={`ml-2 text-xs font-bold ${z.inStock > 0 ? "text-ok" : "text-danger"}`}>{z.inStock > 0 ? `${qtyLabel(z.inStock)} in stock` : "Out of stock"}</span>
                  </span>
                  <span className="text-sm text-muted tnum">
                    Supplier <b className="text-foreground">{formatINR(z.rate)}</b>/pc · Sell{" "}
                    <b className={z.sellRate > 0 ? "text-foreground" : "text-warn"}>{z.sellRate > 0 ? formatINR(z.sellRate) : "not set"}</b>
                    {z.sellRate > 0 && "/pc"}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5">
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {details
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="min-w-0">
                    <dt className="text-xs font-semibold text-muted">{k}</dt>
                    <dd className="break-words font-medium">{v}</dd>
                  </div>
                ))}
            </dl>
          </Card>
        </div>
      </div>
    </>
  );
}
