"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { TagScanner } from "@/components/tag-scanner";

export default function NewTagPage() {
  const router = useRouter();
  return (
    <>
      <PageHeader
        title="Add a new tag"
        subtitle="Take a photo of the supplier tag. We read it, you check it, and it is saved."
      />
      <div className="max-w-2xl rounded-2xl border border-line bg-surface p-4 shadow-sm md:p-5">
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
