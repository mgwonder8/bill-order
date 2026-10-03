import Link from "next/link";
import { Camera, Tag } from "lucide-react";
import { requireUser } from "@/lib/session";
import { listSizes, listTags } from "@/lib/store/data";
import { formatINR } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { EmptyState, PageHeader } from "@/components/ui";

export const metadata = { title: "Saved tags" };

export default async function TagsPage() {
  await requireUser();
  const [tags, sizes] = await Promise.all([listTags(), listSizes()]);

  const header = (
    <PageHeader
      title="Saved tags"
      subtitle={tags.length ? `${tags.length} article${tags.length === 1 ? "" : "s"} with sizes and rates` : undefined}
      action={
        <Link href="/tags/new" className="btn btn-outline">
          <Camera size={18} /> Add tag
        </Link>
      }
    />
  );

  if (tags.length === 0) {
    return (
      <>
        {header}
        <EmptyState icon={Tag} title="No tags yet" body="Scan a supplier tag. The article code, sizes and rates are saved for next time." cta={{ href: "/tags/new", label: "Scan a tag" }} />
      </>
    );
  }

  return (
    <>
      {header}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {tags.map((t) => {
          const rows = sizes.filter((z) => z.tagId === t.id);
          return (
            <Link key={t.id} href={`/tags/${t.id}`} className="card flex gap-4 p-3.5 transition-colors hover:border-accent">
              {t.imageUrl ? (
                // Tag photos come from Supabase Storage at unknown sizes, so plain img.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.imageUrl} alt="" className="h-[5.5rem] w-[4.5rem] shrink-0 rounded-xl bg-background object-cover" />
              ) : (
                <div className="grid h-[5.5rem] w-[4.5rem] shrink-0 place-items-center rounded-xl bg-background">
                  <Tag className="text-muted" size={24} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[1.05rem] font-extrabold">{t.designNo}</p>
                <p className="truncate text-sm text-muted">{t.supplierName}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {rows.map((z) => (
                    <span key={z.id} className="rounded-lg bg-accent-soft px-2 py-0.5 text-xs font-bold text-accent tnum">
                      {z.size} · {formatINR(z.rate)}
                    </span>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-muted">{formatDate(t.createdAt)}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
