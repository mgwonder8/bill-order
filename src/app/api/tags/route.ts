import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser } from "@/lib/session";
import { saveTag } from "@/lib/store/data";
import { toSizeSet } from "@/lib/sets";

export const runtime = "nodejs";

const Body = z.object({
  supplierName: z.string().trim().min(1, "Enter the supplier name"),
  supplierAddress: z.string().trim().default(""),
  supplierPhone: z.string().trim().default(""),
  supplierEmail: z.string().trim().default(""),
  supplierGstin: z.string().trim().toUpperCase().default(""),
  brand: z.string().trim().default(""),
  designNo: z.string().trim().min(1, "Enter the article code (design no)"),
  fabric: z.string().trim().default(""),
  gsm: z.string().trim().default(""),
  color: z.string().trim().default(""),
  remarks: z.string().trim().default(""),
  imageUrl: z.string().trim().default(""),
  driveFileId: z.string().trim().default(""),
  driveWebLink: z.string().trim().default(""),
  sets: z
    .array(
      z.object({
        sizes: z.string().trim().min(1, "Every row needs sizes"),
        pcsPerSet: z.coerce.number().int().min(1).max(50).optional(),
        rate: z.coerce.number().min(0),
      })
    )
    .min(1, "Add at least one size row with a rate"),
});

export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid data" }, { status: 400 });
  }

  const { sets, ...tag } = parsed.data;
  const saved = await saveTag({
    tag: { ...tag, createdBy: user },
    sets: sets.map((row) => {
      const set = toSizeSet(row.sizes);
      return {
        size: set.label,
        sizes: set.sizes.join("/"),
        pcsPerSet: row.pcsPerSet ?? set.pcsPerSet,
        rate: row.rate,
      };
    }),
  });
  return NextResponse.json(saved);
}
