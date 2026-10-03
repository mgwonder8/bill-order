import { PHOTO_BUCKET, supabase } from "@/lib/supabase";

export type StoredFile = { url: string; driveFileId: string; driveWebLink: string };

let bucketReady: Promise<void> | null = null;

function ensureBucket(): Promise<void> {
  bucketReady ??= (async () => {
    const { error } = await supabase().storage.createBucket(PHOTO_BUCKET, { public: false });
    if (error && !/already exists/i.test(error.message)) throw new Error(error.message);
  })().catch((err) => {
    bucketReady = null;
    throw err;
  });
  return bucketReady;
}

/**
 * Stores a tag photo in a private Supabase Storage bucket. The bucket is not public,
 * so signed-in staff read photos back through /api/media. The `driveFileId` field
 * keeps its old name for the saved rows and now holds the storage object name.
 */
export async function saveTagImage(file: { name: string; type: string; buffer: Buffer }): Promise<StoredFile> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_") || "tag.jpg";
  const objectName = `${Date.now()}-${safeName}`;

  await ensureBucket();
  const { error } = await supabase().storage.from(PHOTO_BUCKET).upload(objectName, file.buffer, {
    contentType: file.type || "image/jpeg",
  });
  if (error) throw new Error(error.message);

  return { url: `/api/media/${encodeURIComponent(objectName)}`, driveFileId: objectName, driveWebLink: "" };
}

export async function readPhoto(objectName: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const { data, error } = await supabase().storage.from(PHOTO_BUCKET).download(objectName);
  if (error || !data) throw new Error(error?.message ?? "Photo not found");
  return { buffer: Buffer.from(await data.arrayBuffer()), mimeType: data.type || "application/octet-stream" };
}
