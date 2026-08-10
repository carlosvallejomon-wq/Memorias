"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, desc, eq, inArray } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import { del } from "@vercel/blob";
import { db } from "@/db";
import { albums, challenges, comments, guestbookEntries, media } from "@/db/schema";
import { DEFAULT_CHALLENGE_ICON, isChallengeIconId } from "@/lib/challenge-icons";
import { hashPin, isValidPin } from "@/lib/album-pin";

// Alfabeto sin caracteres ambiguos (0/O, 1/l/I) para códigos fáciles de leer.
const makeCode = customAlphabet("23456789abcdefghjkmnpqrstuvwxyz", 10);

export async function createAlbum(formData: FormData) {
  const { userId } = await auth();
  if (!userId) redirect("/dashboard");

  const name = String(formData.get("name") ?? "").trim();
  const eventDate = String(formData.get("eventDate") ?? "").trim();
  const kind = formData.get("kind") === "familia" ? "familia" : "evento";
  if (!name) return;

  const [album] = await db()
    .insert(albums)
    .values({
      ownerId: userId,
      name,
      kind,
      eventDate: kind === "familia" ? null : eventDate || null,
      shareCode: makeCode(),
    })
    .returning();

  redirect(`/dashboard/${album.id}`);
}

/**
 * Borra los archivos de Blob sin poner en riesgo la respuesta.
 *
 * Un álbum de boda son miles de archivos, y `del` va por tandas contra la red.
 * Con un álbum grande eso se comía el tiempo de la función entera: el usuario
 * veía "algo se ha torcido" aunque el álbum ya estuviera borrado, porque la
 * fila se quita antes que los archivos. Ahora hay presupuesto de tiempo: lo
 * que no dé tiempo a borrar se queda huérfano y se anota, que es mucho menos
 * malo que dejar al organizador mirando una pantalla de error.
 */
const TANDA_BLOBS = 100;
const MARGEN_MS = 6000;

async function borrarArchivos(urls: string[]) {
  const empezado = Date.now();
  let borrados = 0;
  for (let i = 0; i < urls.length; i += TANDA_BLOBS) {
    if (Date.now() - empezado > MARGEN_MS) {
      console.error(
        `Quedaron ${urls.length - borrados} archivos sin borrar por falta de tiempo.`,
      );
      break;
    }
    try {
      await del(urls.slice(i, i + TANDA_BLOBS));
      borrados += Math.min(TANDA_BLOBS, urls.length - i);
    } catch (err) {
      console.error("No se pudo borrar una tanda de archivos:", err);
    }
  }
}

export async function deleteAlbum(albumId: string) {
  const { userId } = await auth();
  if (!userId) return;

  // Fuera del try: `redirect` funciona lanzando una excepción propia de Next,
  // así que atraparla aquí dejaría al usuario en la misma página.
  let fallo: string | null = null;

  try {
    const rows = await db()
      .select({ url: media.url })
      .from(media)
      .where(eq(media.albumId, albumId));

    const deleted = await db()
      .delete(albums)
      .where(and(eq(albums.id, albumId), eq(albums.ownerId, userId)))
      .returning({ id: albums.id });

    if (deleted.length > 0 && rows.length > 0) {
      await borrarArchivos(rows.map((r) => r.url));
    }
  } catch (err) {
    console.error("No se pudo borrar el álbum:", err);
    fallo = err instanceof Error ? err.message : "error desconocido";
  }

  // Aunque algo falle, se vuelve al panel: si el álbum se borró, allí se ve
  // que ya no está; y si no, se ve que sigue. Cualquiera de las dos cosas se
  // entiende mejor que una pantalla de error.
  redirect(fallo ? "/dashboard?error=borrado" : "/dashboard");
}

export async function deleteMedia(mediaId: string) {
  const { userId } = await auth();
  if (!userId) return;

  // Solo el dueño del álbum puede borrar contenido.
  const owned = await db()
    .select({ id: albums.id })
    .from(albums)
    .where(eq(albums.ownerId, userId));
  if (owned.length === 0) return;

  const deleted = await db()
    .delete(media)
    .where(
      and(
        eq(media.id, mediaId),
        inArray(
          media.albumId,
          owned.map((a) => a.id),
        ),
      ),
    )
    .returning({ url: media.url, albumId: media.albumId });

  if (deleted.length > 0) {
    try {
      await del(deleted[0].url);
    } catch (err) {
      console.error("No se pudo borrar el blob:", err);
    }
    revalidatePath(`/dashboard/${deleted[0].albumId}`);
  }
}

export async function approveMedia(mediaId: string) {
  const { userId } = await auth();
  if (!userId) return;

  const owned = await db()
    .select({ id: albums.id })
    .from(albums)
    .where(eq(albums.ownerId, userId));
  if (owned.length === 0) return;

  const [row] = await db()
    .update(media)
    .set({ approved: true })
    .where(
      and(
        eq(media.id, mediaId),
        inArray(
          media.albumId,
          owned.map((a) => a.id),
        ),
      ),
    )
    .returning({ albumId: media.albumId });

  if (row) revalidatePath(`/dashboard/${row.albumId}`);
}

// Retos sugeridos según el tipo de álbum, para que el organizador no tenga
// que pensarlos desde cero (un clic y ya tiene la lista).
export const SUGGESTED_CHALLENGES: Record<string, { emoji: string; title: string }[]> = {
  evento: [
    { emoji: "brindis", title: "El brindis" },
    { emoji: "baile", title: "El mejor momento de baile" },
    { emoji: "amor", title: "Una foto con la persona más mayor de la fiesta" },
    { emoji: "grupo", title: "Un selfie de grupo en tu mesa" },
    { emoji: "zapatos", title: "Los zapatos más llamativos" },
    { emoji: "risa", title: "La foto más divertida de la noche" },
    { emoji: "tarta", title: "La tarta" },
    { emoji: "detalles", title: "Los detalles de la decoración" },
  ],
  familia: [
    { emoji: "comida", title: "Un desayuno cualquiera" },
    { emoji: "mascota", title: "La mascota de la casa" },
    { emoji: "grupo", title: "Toda la familia junta" },
    { emoji: "amanecer", title: "Un atardecer desde casa" },
    { emoji: "risa", title: "El momento más tonto del día" },
    { emoji: "tarta", title: "Un cumpleaños del año" },
  ],
};

async function ownsAlbum(albumId: string, userId: string): Promise<boolean> {
  const [row] = await db()
    .select({ id: albums.id })
    .from(albums)
    .where(and(eq(albums.id, albumId), eq(albums.ownerId, userId)));
  return !!row;
}

export async function createChallenge(albumId: string, formData: FormData) {
  const { userId } = await auth();
  if (!userId || !(await ownsAlbum(albumId, userId))) return;

  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  // El campo guarda la clave de un icono del catálogo; si llega cualquier
  // otra cosa se usa el icono por defecto.
  const iconRaw = String(formData.get("emoji") ?? "").trim();
  const icon = isChallengeIconId(iconRaw) ? iconRaw : DEFAULT_CHALLENGE_ICON;
  if (!title) return;

  const [last] = await db()
    .select({ position: challenges.position })
    .from(challenges)
    .where(eq(challenges.albumId, albumId))
    .orderBy(desc(challenges.position))
    .limit(1);

  await db()
    .insert(challenges)
    .values({
      albumId,
      title,
      emoji: icon,
      position: (last?.position ?? 0) + 1,
    });

  revalidatePath(`/dashboard/${albumId}`);
}

export async function addSuggestedChallenges(albumId: string) {
  const { userId } = await auth();
  if (!userId) return;

  const [album] = await db()
    .select({ id: albums.id, kind: albums.kind })
    .from(albums)
    .where(and(eq(albums.id, albumId), eq(albums.ownerId, userId)));
  if (!album) return;

  const existing = await db()
    .select({ title: challenges.title, position: challenges.position })
    .from(challenges)
    .where(eq(challenges.albumId, albumId));
  const taken = new Set(existing.map((c) => c.title.toLowerCase()));
  let position = existing.reduce((max, c) => Math.max(max, c.position), 0);

  const suggestions = (SUGGESTED_CHALLENGES[album.kind] ?? SUGGESTED_CHALLENGES.evento)
    .filter((s) => !taken.has(s.title.toLowerCase()))
    .map((s) => ({ albumId, title: s.title, emoji: s.emoji, position: ++position }));

  if (suggestions.length > 0) await db().insert(challenges).values(suggestions);

  revalidatePath(`/dashboard/${albumId}`);
}

export async function deleteChallenge(challengeId: string) {
  const { userId } = await auth();
  if (!userId) return;

  const [row] = await db()
    .select({ albumId: challenges.albumId })
    .from(challenges)
    .innerJoin(albums, eq(albums.id, challenges.albumId))
    .where(and(eq(challenges.id, challengeId), eq(albums.ownerId, userId)));
  if (!row) return;

  // Las fotos ya subidas al reto se quedan en el álbum (challenge_id pasa a
  // NULL por la propia definición de la columna).
  await db().delete(challenges).where(eq(challenges.id, challengeId));

  revalidatePath(`/dashboard/${row.albumId}`);
}

// El organizador puede borrar cualquier mensaje del muro de su álbum (los
// invitados solo los suyos, vía /api/guestbook/[entryId]).
export async function deleteGuestbookEntry(entryId: string) {
  const { userId } = await auth();
  if (!userId) return;

  const [row] = await db()
    .select({ albumId: guestbookEntries.albumId })
    .from(guestbookEntries)
    .innerJoin(albums, eq(albums.id, guestbookEntries.albumId))
    .where(and(eq(guestbookEntries.id, entryId), eq(albums.ownerId, userId)));
  if (!row) return;

  await db().delete(guestbookEntries).where(eq(guestbookEntries.id, entryId));

  revalidatePath(`/dashboard/${row.albumId}`);
}

// El organizador puede retirar cualquier comentario de su álbum. Antes un
// comentario fuera de tono se quedaba puesto para siempre.
export async function deleteComment(commentId: string) {
  const { userId } = await auth();
  if (!userId) return;

  const [row] = await db()
    .select({ albumId: media.albumId })
    .from(comments)
    .innerJoin(media, eq(media.id, comments.mediaId))
    .innerJoin(albums, eq(albums.id, media.albumId))
    .where(and(eq(comments.id, commentId), eq(albums.ownerId, userId)));
  if (!row) return;

  await db().delete(comments).where(eq(comments.id, commentId));

  revalidatePath(`/dashboard/${row.albumId}`);
}

export async function setModerationEnabled(albumId: string, enabled: boolean) {
  const { userId } = await auth();
  if (!userId) return;

  await db()
    .update(albums)
    .set({ moderationEnabled: enabled })
    .where(and(eq(albums.id, albumId), eq(albums.ownerId, userId)));

  revalidatePath(`/dashboard/${albumId}`);
}

// Pone o quita el código de acceso del álbum. Cadena vacía = quitarlo, y el
// álbum vuelve a abrirse solo con el enlace.
export async function setAlbumPin(albumId: string, pin: string): Promise<string | null> {
  const { userId } = await auth();
  if (!userId) return "No autorizado";

  const limpio = pin.trim();
  if (limpio && !isValidPin(limpio)) {
    return "El código tiene que ser de 4 a 8 números.";
  }

  await db()
    .update(albums)
    .set({ pinHash: limpio ? hashPin(limpio) : null })
    .where(and(eq(albums.id, albumId), eq(albums.ownerId, userId)));

  revalidatePath(`/dashboard/${albumId}`);
  return null;
}

// Pone o quita la fecha de borrado automático. Cadena vacía = el álbum no
// caduca, que es como está por defecto.
export async function setAlbumExpiry(
  albumId: string,
  fecha: string,
): Promise<string | null> {
  const { userId } = await auth();
  if (!userId) return "No autorizado";

  const limpio = fecha.trim();
  let expiresAt: Date | null = null;
  if (limpio) {
    // Al final del día elegido, para que ese mismo día el álbum siga abierto.
    expiresAt = new Date(`${limpio}T23:59:59`);
    if (Number.isNaN(expiresAt.getTime())) return "Esa fecha no es válida.";
    if (expiresAt.getTime() <= Date.now()) {
      return "Elige una fecha futura: así nadie se queda sin sus fotos por error.";
    }
  }

  await db()
    .update(albums)
    .set({ expiresAt })
    .where(and(eq(albums.id, albumId), eq(albums.ownerId, userId)));

  revalidatePath(`/dashboard/${albumId}`);
  return null;
}
