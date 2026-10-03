import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { Readable } from "stream";
import { driveConfigured, env } from "@/lib/env";
import { getDriveClient } from "@/lib/google/clients";

export type StoredFile = { url: string; driveFileId: string; driveWebLink: string };

/**
 * Puts a tag photo in the shared Google Drive folder. Drive files uploaded by a
 * service account are private to it, so the app serves them back through
 * /api/media rather than linking the Drive URL directly. Falls back to
 * public/uploads on disk when no Drive folder is configured, which keeps the app
 * usable in local testing but will not survive a serverless deploy.
 */
export async function saveTagImage(file: { name: string; type: string; buffer: Buffer }): Promise<StoredFile> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_") || "tag.jpg";
  const filename = `${Date.now()}-${safeName}`;

  if (driveConfigured()) {
    const drive = getDriveClient();
    const res = await drive.files.create({
      requestBody: { name: filename, parents: [env.driveFolderId] },
      media: { mimeType: file.type || "image/jpeg", body: Readable.from(file.buffer) },
      fields: "id, webViewLink",
      // A service account has no storage quota of its own, so the destination
      // folder must be inside a Shared Drive (Google Workspace); this flag is
      // required for the API to operate on Shared Drive items at all.
      supportsAllDrives: true,
    });
    const id = res.data.id ?? "";
    return {
      url: `/api/media/${id}`,
      driveFileId: id,
      driveWebLink: res.data.webViewLink ?? "",
    };
  }

  const dir = path.join(process.cwd(), "public", "uploads", "tags");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), file.buffer);
  return { url: `/uploads/tags/${filename}`, driveFileId: "", driveWebLink: "" };
}

/** Streams a Drive file back to the browser, authenticated as the service account. */
export async function readDriveFile(fileId: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const drive = getDriveClient();
  const meta = await drive.files.get({ fileId, fields: "mimeType", supportsAllDrives: true });
  const res = await drive.files.get(
    { fileId, alt: "media", supportsAllDrives: true },
    { responseType: "arraybuffer" }
  );
  return {
    buffer: Buffer.from(res.data as ArrayBuffer),
    mimeType: meta.data.mimeType ?? "application/octet-stream",
  };
}
