"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import { del } from "@vercel/blob";
import { db } from "@/db";
import { albums, media } from "@/db/schema";

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

export async function setModerationEnabled(albumId: string, enabled: boolean) {
  const { userId } = await auth();
  if (!userId) return;

  await db()
    .update(albums)
    .set({ moderationEnabled: enabled })
    .where(and(eq(albums.id, albumId), eq(albums.ownerId, userId)));

  revalidatePath(`/dashboard/${albumId}`);
}
