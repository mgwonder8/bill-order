import { NextResponse } from "next/server";
import { apiUser } from "@/lib/session";
import { readDriveFile } from "@/lib/storage/drive";

export const runtime = "nodejs";

/**
 * Serves a tag photo out of Drive. Service account uploads are not publicly
 * readable, so signed in staff fetch them through here rather than a Drive link.
 */
export async function GET(_req: Request, { params }: RouteContext<"/api/media/[id]">) {
  if (!(await apiUser())) return new NextResponse("Not signed in", { status: 401 });

  const { id } = await params;
  try {
    const { buffer, mimeType } = await readDriveFile(id);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (err) {
    console.error("[media] could not read Drive file", id, err);
    return new NextResponse("Not found", { status: 404 });
  }
}
