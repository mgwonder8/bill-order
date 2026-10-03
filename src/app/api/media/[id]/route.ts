import { NextResponse } from "next/server";
import { apiUser } from "@/lib/session";
import { readPhoto } from "@/lib/storage/photos";

export const runtime = "nodejs";

/** Serves a tag photo from the private bucket to signed-in staff. */
export async function GET(_req: Request, { params }: RouteContext<"/api/media/[id]">) {
  if (!(await apiUser())) return new NextResponse("Not signed in", { status: 401 });

  const { id } = await params;
  try {
    const { buffer, mimeType } = await readPhoto(decodeURIComponent(id));
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (err) {
    console.error("[media] could not read photo", id, err);
    return new NextResponse("Not found", { status: 404 });
  }
}
