import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, ClipboardList } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getTag } from "@/lib/store/data";
import { formatINR } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";
import { Card } from "@/components/ui";

export const metadata = { title: "Saved tag" };

export default async function TagPage({ params, searchParams }: PageProps<"/tags/[id]">) {
  await requireUser();
  const { id } = await params;
  const justSaved = (await searchParams).new === "1";
  const found = await getTag(id);
  if (!found) notFound();
  const { tag, sizes } = found;

  return (
    <>
      <div className="mb-4">
        <Link href="/tags" className="text-base text-muted hover:text-foreground">
          &larr; All tags
        </Link>
      </div>

      {justSaved && (
        <div className="mb-5 flex items-center gap-3 rounded-2xl bg-ok/10 px-5 py-4 text-ok">
          <CheckCircle2 size={24} />
          <p className="text-base font-semibold">Tag saved.</p>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-[180px_1fr]">
        {tag.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={tag.imageUrl} alt="Tag photo" className="w-full max-w-[180px] rounded-2xl border border-line object-cover" />
        ) : null}
        <Card className="p-5">
          <h1 className="text-2xl font-bold tracking-tight">{tag.designNo}</h1>
          <dl className="mt-3 grid gap-x-6 gap-y-2 text-base sm:grid-cols-2">
            <Info label="Brand" value={tag.brand} />
            <Info label="Fabric" value={[tag.fabric, tag.gsm && `${tag.gsm} GSM`].filter(Boolean).join(", ")} />
            <Info label="Colour" value={tag.color} />
            <Info label="Supplier" value={tag.supplierName} />
            <Info label="Supplier GST no" value={tag.supplierGstin || "Not added"} />
            <Info label="Supplier phone" value={tag.supplierPhone} />
            <Info label="Supplier address" value={tag.supplierAddress} />
            <Info label="Saved on" value={`${formatDateTime(tag.createdAt)} by ${tag.createdBy}`} />
          </dl>

          <h2 className="mt-5 text-lg font-bold">Sizes and rates</h2>
          <ul className="mt-2 divide-y divide-line rounded-xl border border-line">
            {sizes.map((z) => (
              <li key={z.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-base">
                <span>
                  <b>Size {z.size}</b> <span className="text-muted">({z.sizes.replaceAll("/", ", ")})</span>
                </span>
                <span className="tnum">
                  <b>{formatINR(z.rate)}</b> per piece · 1 set = {z.pcsPerSet} pcs = {formatINR(z.rate * z.pcsPerSet)}
                </span>
              </li>
            ))}
          </ul>

          <Link href={`/orders/new?tag=${tag.id}`} className="btn btn-primary mt-5">
            <ClipboardList size={18} /> Make an order with this article
          </Link>
        </Card>
      </div>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
