import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { albums, comments, guestbookEntries, media, reactions } from "@/db/schema";
import { buildDotbookPdf, DOTBOOK_STYLES, type DotbookStyle } from "@/lib/build-dotbook";
type Album = typeof albums.$inferSelect;

// Reunir todo lo que lleva el Dotbook (fotos, comentarios, reacciones y
// dedicatorias) son bastantes consultas. Viven aquí y no en la ruta porque hay
// dos puertas al mismo libro: la del organizador desde su panel y la del dueño
// del evento desde su enlace privado. Duplicarlas era garantizar que un día
// una de las dos se quedara atrás.

/** Solo los estilos que existen; cualquier otra cosa cae en el clásico. */
export function parseDotbookStyle(value: string | null): DotbookStyle {
  return DOTBOOK_STYLES.some((s) => s.id === value) ? (value as DotbookStyle) : "clasico";
}

export async function dotbookResponse(album: Album, style: DotbookStyle) {
  const items = await db()
    .select()
    .from(media)
    .where(eq(media.albumId, album.id))
    .orderBy(asc(media.createdAt));

  if (items.length === 0) {
    return NextResponse.json(
      { error: "El álbum está vacío, no hay nada que incluir en el Dotbook." },
      { status: 400 },
    );
  }

  const commentsByMedia = new Map<string, string[]>();
  const allComments = await db()
    .select({ mediaId: comments.mediaId, body: comments.body })
    .from(comments)
    .innerJoin(media, eq(comments.mediaId, media.id))
    .where(eq(media.albumId, album.id))
    .orderBy(asc(comments.createdAt));
  for (const c of allComments) {
    const list = commentsByMedia.get(c.mediaId) ?? [];
    if (list.length < 2) {
      list.push(c.body);
      commentsByMedia.set(c.mediaId, list);
    }
  }

  const reactionCountByMedia = new Map<string, number>();
  const allReactions = await db()
    .select({ mediaId: reactions.mediaId })
    .from(reactions)
    .innerJoin(media, eq(reactions.mediaId, media.id))
    .where(eq(media.albumId, album.id));
  for (const r of allReactions) {
    reactionCountByMedia.set(r.mediaId, (reactionCountByMedia.get(r.mediaId) ?? 0) + 1);
  }

  const messages = await db()
    .select({
      authorName: guestbookEntries.authorName,
      body: guestbookEntries.body,
      createdAt: guestbookEntries.createdAt,
    })
    .from(guestbookEntries)
    .where(eq(guestbookEntries.albumId, album.id))
    .orderBy(asc(guestbookEntries.createdAt));

  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const baseUrl = `${proto}://${host}`;
  const shareUrl = `${baseUrl}/a/${album.shareCode}`;

  const pdfBytes = await buildDotbookPdf(
    album,
    items,
    { commentsByMedia, reactionCountByMedia, messages, shareUrl, baseUrl },
    style,
  );

  const safeName = album.name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="dotbook-${safeName || "album"}.pdf"`,
    },
  });
}
