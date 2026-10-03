import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser } from "@/lib/session";
import { setSellRate } from "@/lib/store/data";

export const runtime = "nodejs";

const Body = z.object({ sellRate: z.coerce.number().min(0).max(1_000_000) });

/** Changes the selling price per piece of one article size range. */
export async function PATCH(req: Request, { params }: RouteContext<"/api/sizes/[id]">) {
  if (!(await apiUser())) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { id } = await params;
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid price" }, { status: 400 });
  if (!(await setSellRate(id, parsed.data.sellRate))) return NextResponse.json({ error: "Article not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
