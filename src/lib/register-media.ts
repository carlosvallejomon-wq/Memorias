import { db } from "@/db";
import { media } from "@/db/schema";

const ALLOWED_HOST_SUFFIX = ".blob.vercel-storage.com";

export function isAllowedBlobUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname.endsWith(ALLOWED_HOST_SUFFIX);
  } catch {
    return false;
  }
}

export async function registerMedia(input: {
  albumId: string;
  url: string;
  pathname?: string | null;
  contentType?: string | null;
  uploaderName?: string | null;
  uploaderId?: string | null;
  takenAt?: number | null;
  approved: boolean;
}) {
  const type = input.contentType?.startsWith("video/") ? "video" : "image";
  await db()
    .insert(media)
    .values({
      albumId: input.albumId,
      url: input.url,
      pathname: input.pathname ?? null,
      type,
      uploaderName: input.uploaderName || null,
      uploaderId: input.uploaderId || null,
      approved: input.approved,
      takenAt: input.takenAt ? new Date(input.takenAt) : null,
    })
    .onConflictDoNothing({ target: media.url });
}
