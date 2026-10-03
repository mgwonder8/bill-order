import { NextResponse } from "next/server";
import { apiUser } from "@/lib/session";
import { updateOrder } from "@/lib/store/data";
import { OrderBody, resolveOrder } from "@/lib/order-input";

export const runtime = "nodejs";

export async function PUT(req: Request, { params }: RouteContext<"/api/orders/[id]">) {
  if (!(await apiUser())) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { id } = await params;

  const parsed = OrderBody.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid data" }, { status: 400 });
  }
  const result = await updateOrder(id, await resolveOrder(parsed.data));
  if (result === "missing") return NextResponse.json({ error: "This order no longer exists." }, { status: 404 });
  if (result === "billed") {
    return NextResponse.json({ error: "This order is already billed and cannot be changed." }, { status: 409 });
  }
  return NextResponse.json({ orderId: id });
}
