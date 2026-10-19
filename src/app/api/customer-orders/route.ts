import { NextResponse } from "next/server";
import { apiUser } from "@/lib/session";
import { createCustomerOrder } from "@/lib/store/data";
import { CustomerOrderBody } from "@/lib/order-input";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = CustomerOrderBody.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid data" }, { status: 400 });
  }
  const result = await createCustomerOrder(parsed.data, user);
  if ("error" in result) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result);
}
