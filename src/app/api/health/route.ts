import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Touches the database so it counts as activity. Supabase's free plan pauses a
 * project that sees none for about a week; a scheduled call to this keeps it awake.
 * Returns no data, only whether the database answered.
 */
export async function GET() {
  try {
    const { error } = await supabase().from("suppliers").select("id").limit(1);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[health] database not reachable", err);
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
