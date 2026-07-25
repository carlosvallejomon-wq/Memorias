"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, desc, eq, inArray } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import { del } from "@vercel/blob";
import { db } from "@/db";
import { albums, challenges, guestbookEntries, media } from "@/db/schema";

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

export async function deleteAlbum(albumId: string) {
  const { userId } = await auth();
  if (!userId) return;

  const rows = await db()
    .select({ url: media.url })
    .from(media)
    .where(eq(media.albumId, albumId));

  const deleted = await db()
    .delete(albums)
    .where(and(eq(albums.id, albumId), eq(albums.ownerId, userId)))
    .returning({ id: albums.id });

  if (deleted.length > 0 && rows.length > 0) {
    try {
      await del(rows.map((r) => r.url));
    } catch (err) {
      console.error("No se pudieron borrar los blobs del álbum:", err);
    }
  }

  redirect("/dashboard");
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
    { emoji: "🥂", title: "El brindis" },
    { emoji: "💃", title: "El mejor momento de baile" },
    { emoji: "👵", title: "Una foto con la persona más mayor de la fiesta" },
    { emoji: "🤳", title: "Un selfie de grupo en tu mesa" },
    { emoji: "👟", title: "Los zapatos más llamativos" },
    { emoji: "😂", title: "La foto más divertida de la noche" },
    { emoji: "🍰", title: "La tarta" },
    { emoji: "🎁", title: "Los detalles de la decoración" },
  ],
  familia: [
    { emoji: "🍳", title: "Un desayuno cualquiera" },
    { emoji: "🐾", title: "La mascota de la casa" },
    { emoji: "👨‍👩‍👧", title: "Toda la familia junta" },
    { emoji: "🌅", title: "Un atardecer desde casa" },
    { emoji: "😴", title: "Alguien dormido en el sofá" },
    { emoji: "🎂", title: "Un cumpleaños del año" },
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
  const emoji = String(formData.get("emoji") ?? "").trim().slice(0, 8);
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
      emoji: emoji || "📸",
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

export async function setModerationEnabled(albumId: string, enabled: boolean) {
  const { userId } = await auth();
  if (!userId) return;

  await db()
    .update(albums)
    .set({ moderationEnabled: enabled })
    .where(and(eq(albums.id, albumId), eq(albums.ownerId, userId)));

  revalidatePath(`/dashboard/${albumId}`);
}
