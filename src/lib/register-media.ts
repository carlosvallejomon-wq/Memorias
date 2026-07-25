import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { challenges, media } from "@/db/schema";

const ALLOWED_HOST_SUFFIX = ".blob.vercel-storage.com";

export function isAllowedBlobUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname.endsWith(ALLOWED_HOST_SUFFIX);
  } catch {
    return false;
  }
}

// Comprueba que el reto exista y pertenezca al álbum antes de asociarlo, para
// que nadie pueda colgar una foto de un reto de otro álbum manipulando la
// petición.
async function validChallengeId(
  albumId: string,
  challengeId: string | null | undefined,
): Promise<string | null> {
  if (!challengeId) return null;
  const [row] = await db()
    .select({ id: challenges.id })
    .from(challenges)
    .where(and(eq(challenges.id, challengeId), eq(challenges.albumId, albumId)));
  return row?.id ?? null;
}

export async function registerMedia(input: {
  albumId: string;
  url: string;
  pathname?: string | null;
  contentType?: string | null;
  uploaderName?: string | null;
  uploaderId?: string | null;
  takenAt?: number | null;
  challengeId?: string | null;
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
      challengeId: await validChallengeId(input.albumId, input.challengeId),
    })
    .onConflictDoNothing({ target: media.url });
}
