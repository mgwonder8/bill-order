"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { TagScanner } from "@/components/tag-scanner";

export default function NewTagPage() {
  const router = useRouter();
  return (
    <>
      <PageHeader back={{ href: "/tags", label: "Saved tags" }} title="Add a tag" subtitle="Photo of the tag → check → save." />
      <div className="card max-w-2xl p-4 md:p-5">
        <TagScanner
          saveLabel="Save tag"
          onSaved={(saved) => {
            router.push(`/tags/${saved.tagId}?new=1`);
            router.refresh();
          }}
        />
      </div>
    </>
  );
}
