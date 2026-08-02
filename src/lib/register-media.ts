import { and, eq, isNull } from "drizzle-orm";
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
  posterUrl?: string | null;
  uploaderName?: string | null;
  uploaderId?: string | null;
  takenAt?: number | null;
  challengeId?: string | null;
  approved: boolean;
}) {
  const type = input.contentType?.startsWith("video/") ? "video" : "image";
  // La miniatura del vídeo también vive en Blob; se valida igual que el
  // archivo principal para que nadie cuele una URL cualquiera.
  const posterUrl =
    input.posterUrl && isAllowedBlobUrl(input.posterUrl) ? input.posterUrl : null;
  await db()
    .insert(media)
    .values({
      albumId: input.albumId,
      url: input.url,
      pathname: input.pathname ?? null,
      type,
      posterUrl,
      uploaderName: input.uploaderName || null,
      uploaderId: input.uploaderId || null,
      approved: input.approved,
      takenAt: input.takenAt ? new Date(input.takenAt) : null,
      challengeId: await validChallengeId(input.albumId, input.challengeId),
    })
    .onConflictDoNothing({ target: media.url });

  // El vídeo se registra dos veces (el navegador y el webhook de Vercel) y
  // solo el navegador conoce la miniatura. Si ganó la carrera el webhook, la
  // fila ya existe sin miniatura: se la ponemos aquí.
  if (posterUrl) {
    await db()
      .update(media)
      .set({ posterUrl })
      .where(and(eq(media.url, input.url), isNull(media.posterUrl)));
  }
}
