import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser } from "@/lib/session";
import { billOrder } from "@/lib/store/data";

export const runtime = "nodejs";

const Body = z.object({
  orderId: z.string().trim().min(1),
  customerName: z.string().trim().min(1, "Enter the customer name"),
  customerPhone: z.string().trim().default(""),
  customerGstin: z.string().trim().toUpperCase().default(""),
  customerAddress: z.string().trim().default(""),
  notes: z.string().trim().default(""),
  hsn: z.string().trim().default(""),
  discounts: z.record(z.string(), z.coerce.number().min(0).max(100)).default({}),
});

/** Confirms an order: the bill is built from the saved order lines, only discounts come from the screen. */
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid data" }, { status: 400 });
  }
  const { orderId, ...input } = parsed.data;
  const result = await billOrder(orderId, input, user);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 409 });
  return NextResponse.json(result);
}
