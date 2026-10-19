import { NextResponse } from "next/server";
import { apiUser } from "@/lib/session";
import { updateCustomerOrder } from "@/lib/store/data";
import { CustomerOrderBody } from "@/lib/order-input";

export const runtime = "nodejs";

export async function PUT(req: Request, { params }: RouteContext<"/api/customer-orders/[id]">) {
  if (!(await apiUser())) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { id } = await params;

  const parsed = CustomerOrderBody.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid data" }, { status: 400 });
  }
  const result = await updateCustomerOrder(id, parsed.data);
  if ("error" in result) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result);
}
