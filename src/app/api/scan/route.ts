import { NextResponse } from "next/server";
import { apiUser } from "@/lib/session";
import { aiConfigured } from "@/lib/env";
import { extractTag } from "@/lib/ai/extract-tag";
import { saveTagImage } from "@/lib/storage/photos";
import type { TagExtract } from "@/lib/types";

export const runtime = "nodejs";
// Vision on a high detail photo regularly runs past the default budget.
export const maxDuration = 60;

const MAX_BYTES = 12 * 1024 * 1024;

/**
 * Takes one tag photo, stores it in Supabase Storage, and returns the fields read off it.
 * Nothing is written to the ledger here: the reply is a draft the clerk confirms
 * on screen before /api/tags saves it.
 */
export async function POST(req: Request) {
  if (!(await apiUser())) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Attach a photo of the tag." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "That photo is over 12 MB. Try a smaller one." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const image = { name: file.name || "tag.jpg", type: file.type || "image/jpeg", buffer };

  // The photo is worth keeping even when the reading fails, so store it first.
  let stored;
  try {
    stored = await saveTagImage(image);
  } catch (err) {
    console.error("[scan] storing the photo failed", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Could not store the photo: ${message}` }, { status: 500 });
  }

  if (!aiConfigured()) {
    return NextResponse.json({
      stored,
      extract: blankExtract(),
      error: "No OPENAI_API_KEY is set, so the tag was not read. Fill the fields in by hand.",
    });
  }

  try {
    const extract = await extractTag({ buffer, type: image.type });
    return NextResponse.json({ stored, extract });
  } catch (err) {
    console.error("[scan] extraction failed", err);
    return NextResponse.json({
      stored,
      extract: blankExtract(),
      error: "The tag could not be read automatically. The photo is saved, fill the fields in by hand.",
    });
  }
}

function blankExtract(): TagExtract {
  return {
    supplierName: "",
    supplierAddress: "",
    supplierPhone: "",
    supplierEmail: "",
    supplierGstin: "",
    brand: "",
    designNo: "",
    fabric: "",
    gsm: "",
    color: "",
    sizeRates: [],
    remarks: "",
    confidence: "low",
    warnings: [],
  };
}
