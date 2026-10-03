import Link from "next/link";
import { Plus, Tag } from "lucide-react";
import { requireUser } from "@/lib/session";
import { listSizes, listTags } from "@/lib/store/data";
import { formatINR } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";
import { Card, EmptyState, PageHeader, PrimaryLink } from "@/components/ui";

export const metadata = { title: "Tags" };

export default async function TagsPage() {
  await requireUser();
  const [tags, sizes] = await Promise.all([listTags(), listSizes()]);

  const header = (
    <PageHeader
      title="Saved tags"
      subtitle="Every article saved from a supplier tag, with its sizes and rates."
      action={
        <PrimaryLink href="/tags/new">
          <Plus size={18} /> Add a new tag
        </PrimaryLink>
      }
    />
  );

  if (tags.length === 0) {
    return (
      <>
        {header}
        <EmptyState
          title="No tags yet"
          body="Take a photo of a supplier tag. The app reads the article code, sizes and rates and saves them."
          cta={{ href: "/tags/new", label: "Add your first tag" }}
        />
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
            <Link key={t.id} href={`/tags/${t.id}`} className="group">
              <Card className="flex h-full gap-4 p-4 transition-colors group-hover:border-accent">
                {t.imageUrl ? (
                  // Tag photos come from Supabase Storage at unknown sizes, so plain img.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.imageUrl} alt="" className="h-24 w-20 shrink-0 rounded-xl border border-line object-cover" />
                ) : (
                  <div className="grid h-24 w-20 shrink-0 place-items-center rounded-xl border border-line bg-black/[0.03]">
                    <Tag className="text-muted" size={26} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-bold">{t.designNo}</p>
                  <p className="truncate text-sm text-muted">{[t.brand, t.fabric].filter(Boolean).join(" · ")}</p>
                  <p className="truncate text-sm text-muted">{t.supplierName}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {rows.map((z) => (
                      <span key={z.id} className="rounded-lg bg-accent-soft px-2 py-0.5 text-sm font-semibold text-accent tnum">
                        {z.size} · {formatINR(z.rate)}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted tnum">Added {formatDateTime(t.createdAt)}</p>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </>
  );
}
