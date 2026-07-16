import { NextRequest, NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { albums, comments, media, reactions } from "@/db/schema";
import { isAllowedBlobUrl, registerMedia } from "@/lib/register-media";

export const dynamic = "force-dynamic";

async function findAlbum(code: string) {
  const [album] = await db()
    .select({ id: albums.id })
    .from(albums)
    .where(eq(albums.shareCode, code));
  return album ?? null;
}

// Lista el contenido del álbum con contadores de comentarios y reacciones.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const guestId = request.nextUrl.searchParams.get("guestId") ?? "";

  const album = await findAlbum(code);
  if (!album) {
    return NextResponse.json({ error: "Álbum no encontrado" }, { status: 404 });
  }

  const items = await db()
    .select({
      id: media.id,
      url: media.url,
      type: media.type,
      uploaderName: media.uploaderName,
      takenAt: media.takenAt,
      createdAt: media.createdAt,
    })
    .from(media)
    .where(eq(media.albumId, album.id))
    .orderBy(desc(sql`coalesce(${media.takenAt}, ${media.createdAt})`));

  const [reactionRows, commentRows] = await Promise.all([
    db()
      .select({
        mediaId: reactions.mediaId,
        emoji: reactions.emoji,
        guestId: reactions.guestId,
      })
      .from(reactions)
      .innerJoin(media, eq(reactions.mediaId, media.id))
      .where(eq(media.albumId, album.id)),
    db()
      .select({ mediaId: comments.mediaId, n: sql<number>`count(*)::int` })
      .from(comments)
      .innerJoin(media, eq(comments.mediaId, media.id))
      .where(eq(media.albumId, album.id))
      .groupBy(comments.mediaId),
  ]);

  const commentCounts = new Map(commentRows.map((r) => [r.mediaId, r.n]));
  const reactionsByMedia = new Map<string, Record<string, number>>();
  const myReactionsByMedia = new Map<string, string[]>();
  for (const r of reactionRows) {
    const agg = reactionsByMedia.get(r.mediaId) ?? {};
    agg[r.emoji] = (agg[r.emoji] ?? 0) + 1;
    reactionsByMedia.set(r.mediaId, agg);
    if (guestId && r.guestId === guestId) {
      myReactionsByMedia.set(r.mediaId, [
        ...(myReactionsByMedia.get(r.mediaId) ?? []),
        r.emoji,
      ]);
    }
  }

  return NextResponse.json({
    items: items.map((it) => ({
      ...it,
      commentCount: commentCounts.get(it.id) ?? 0,
      reactions: reactionsByMedia.get(it.id) ?? {},
      myReactions: myReactionsByMedia.get(it.id) ?? [],
    })),
  });
}

// Registra un archivo ya subido a Vercel Blob (lo llama el navegador del
// invitado justo después de completar la subida directa).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const album = await findAlbum(code);
  if (!album) {
    return NextResponse.json({ error: "Álbum no encontrado" }, { status: 404 });
  }

  const body = (await request.json()) as {
    url?: string;
    pathname?: string;
    contentType?: string;
    uploaderName?: string;
    takenAt?: number;
  };

  if (!body.url || !isAllowedBlobUrl(body.url)) {
    return NextResponse.json({ error: "URL no válida" }, { status: 400 });
  }

  await registerMedia({
    albumId: album.id,
    url: body.url,
    pathname: body.pathname ?? null,
    contentType: body.contentType ?? null,
    uploaderName: body.uploaderName ?? null,
    takenAt: body.takenAt ?? null,
  });

  return NextResponse.json({ ok: true });
}
