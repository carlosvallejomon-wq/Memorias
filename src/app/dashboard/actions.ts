"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import { del } from "@vercel/blob";
import { db } from "@/db";
import { albums, challenges, comments, guestbookEntries, media } from "@/db/schema";
import { DEFAULT_CHALLENGE_ICON, isChallengeIconId } from "@/lib/challenge-icons";
import { hashPin, isValidPin } from "@/lib/album-pin";

// Alfabeto sin caracteres ambiguos (0/O, 1/l/I) para códigos fáciles de leer.
const makeCode = customAlphabet("23456789abcdefghjkmnpqrstuvwxyz", 10);

/**
 * Crear y borrar devuelven el resultado en vez de redirigir.
 *
 * Antes las dos terminaban con `redirect()`, que en Next funciona lanzando una
 * excepción propia. Esa excepción, viajando desde una acción de servidor hasta
 * un `startTransition` o un formulario, es lo único que distinguía a estas dos
 * de las demás acciones del panel — que funcionaban todas. Devolver un dato
 * normal y navegar desde el navegador quita ese camino de en medio, y además
 * permite enseñar el motivo cuando algo falla en vez de la pantalla genérica.
 */
export type ResultadoAlbum =
  | { ok: true; albumId: string }
  | { ok: false; error: string };

export async function createAlbum(formData: FormData): Promise<ResultadoAlbum> {
  // El try envuelve TODO, incluida la sesión: cualquier cosa que se escapara
  // de aquí llegaba al navegador como "An error occurred in the Server
  // Components render", sin decir qué había pasado.
  try {
    const { userId } = await auth();
    if (!userId) return { ok: false, error: "No has iniciado sesión." };

    const name = String(formData.get("name") ?? "").trim();
    const eventDate = String(formData.get("eventDate") ?? "").trim();
    const kind = formData.get("kind") === "familia" ? "familia" : "evento";
    if (!name) return { ok: false, error: "Ponle un nombre al álbum." };

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
    if (!album) return { ok: false, error: "La base de datos no devolvió el álbum." };
    // Sin `revalidatePath` ni `redirect`: los dos hacen que el servidor vuelva
    // a dibujar una página como parte de la respuesta de la acción, y era ese
    // redibujado el que fallaba ("An error occurred in the Server Components
    // render"), no la acción. La lista la refresca el navegador al navegar.
    return { ok: true, albumId: album.id };
  } catch (err) {
    console.error("No se pudo crear el álbum:", err);
    return { ok: false, error: err instanceof Error ? err.message : "error desconocido" };
  }
}

/**
 * Borra los archivos de Blob **después** de haber contestado.
 *
 * Esto es lo que hacía que borrar se quedara girando. Un álbum de boda son
 * miles de archivos y `del` va por tandas contra la red: aunque la fila de la
 * base de datos desaparece al instante —el álbum ya es inaccesible—, la acción
 * seguía esperando a que Blob confirmara archivo por archivo antes de
 * responder. Desde fuera parecía que no se había borrado nada, y había que
 * refrescar para verlo.
 *
 * `after` deja la limpieza para cuando la respuesta ya ha salido: el navegador
 * vuelve al panel sin el álbum de inmediato y los archivos se van borrando por
 * detrás. Si esa parte falla, quedan huérfanos en Blob (ocupan sitio, no se
 * ven), que es mucho menos malo que dejar al organizador esperando.
 */
const TANDA_BLOBS = 100;

function borrarArchivosLuego(urls: string[]) {
  if (urls.length === 0) return;
  after(async () => {
    for (let i = 0; i < urls.length; i += TANDA_BLOBS) {
      try {
        await del(urls.slice(i, i + TANDA_BLOBS));
      } catch (err) {
        console.error("No se pudo borrar una tanda de archivos:", err);
      }
    }
  });
}

export async function deleteAlbum(albumId: string): Promise<{ ok: boolean; error?: string }> {
  let fallo: string | null = null;

  // Igual que al crear: nada se escapa sin explicarse.
  try {
    const { userId } = await auth();
    if (!userId) return { ok: false, error: "No has iniciado sesión." };

    const rows = await db()
      .select({ url: media.url, posterUrl: media.posterUrl })
      .from(media)
      .where(eq(media.albumId, albumId));

    const deleted = await db()
      .delete(albums)
      .where(and(eq(albums.id, albumId), eq(albums.ownerId, userId)))
      .returning({ id: albums.id });

    if (deleted.length > 0) {
      borrarArchivosLuego(
        rows.flatMap((r) => [r.url, r.posterUrl]).filter((u): u is string => !!u),
      );
    }
  } catch (err) {
    console.error("No se pudo borrar el álbum:", err);
    fallo = err instanceof Error ? err.message : "error desconocido";
  }

  // Igual que al crear: nada de redibujar aquí. El navegador vuelve al panel
  // y lo refresca él.
  return fallo ? { ok: false, error: fallo } : { ok: true };
}

/**
 * Borrar una foto: devuelve el resultado y no redibuja nada.
 *
 * Antes terminaba con `revalidatePath`, que hace que el servidor vuelva a
 * dibujar la página del álbum —con sus diez consultas— como parte de la
 * respuesta. Encima había que esperar a que Blob confirmara el borrado del
 * archivo. Entre las dos cosas, el botón se quedaba girando y no terminaba: la
 * foto se borraba, pero había que refrescar para verlo. La lista la refresca
 * ahora el navegador, que para eso ya está delante.
 */
export async function deleteMedia(mediaId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { ok: false, error: "No has iniciado sesión." };

    // Solo el dueño del álbum puede borrar contenido.
    const owned = await db()
      .select({ id: albums.id })
      .from(albums)
      .where(eq(albums.ownerId, userId));
    if (owned.length === 0) return { ok: false, error: "No es tu álbum." };

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
      .returning({ url: media.url, posterUrl: media.posterUrl });

    if (deleted.length > 0) {
      // El archivo se borra después de contestar, igual que al borrar el álbum:
      // esperar a que Blob confirme es justo lo que dejaba el botón girando.
      borrarArchivosLuego(
        [deleted[0].url, deleted[0].posterUrl].filter((u): u is string => !!u),
      );
    }
    return { ok: true };
  } catch (err) {
    console.error("No se pudo borrar la foto:", err);
    return { ok: false, error: err instanceof Error ? err.message : "error desconocido" };
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
// OJO: sin `export`. Un archivo con "use server" solo puede exportar
// funciones asíncronas; al exportar aquí un objeto, Next no puede montar el
// módulo como conjunto de acciones y fallan TODAS las de este archivo — que es
// justo lo que pasaba con crear y borrar, mientras la acción de diagnóstico,
// que vive en otro archivo y solo exporta funciones, funcionaba. No hacía
// falta exportarlo: solo se usa aquí abajo.
const SUGGESTED_CHALLENGES: Record<string, { emoji: string; title: string }[]> = {
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
