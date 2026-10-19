import { NextResponse } from "next/server";
import { apiUser } from "@/lib/session";
import { billCustomerOrder } from "@/lib/store/data";
import { BillBody } from "@/lib/order-input";

export const runtime = "nodejs";

/** Bills a saved customer order form, with or without GST. */
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = BillBody.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid data" }, { status: 400 });
  }
  const result = await billCustomerOrder(parsed.data, user);
  if ("error" in result) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result);
}
