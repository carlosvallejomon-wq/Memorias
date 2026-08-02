import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { comments, media, reactions } from "@/db/schema";
import { guardAlbum } from "@/lib/guest-guard";
import { isAllowedBlobUrl, registerMedia } from "@/lib/register-media";

export const dynamic = "force-dynamic";

// Lista el contenido del álbum con contadores de comentarios y reacciones.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const guestId = request.nextUrl.searchParams.get("guestId") ?? "";

  const guard = await guardAlbum(code);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const album = guard.album;

  const items = await db()
    .select({
      id: media.id,
      url: media.url,
      type: media.type,
      posterUrl: media.posterUrl,
      uploaderName: media.uploaderName,
      uploaderId: media.uploaderId,
      challengeId: media.challengeId,
      approved: media.approved,
      takenAt: media.takenAt,
      createdAt: media.createdAt,
    })
    .from(media)
    .where(
      and(
        eq(media.albumId, album.id),
        // Las fotos pendientes de aprobar solo las ve quien las subió.
        or(eq(media.approved, true), guestId ? eq(media.uploaderId, guestId) : undefined),
      ),
    )
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
  const guard = await guardAlbum(code);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const album = guard.album;

  const body = (await request.json()) as {
    url?: string;
    pathname?: string;
    contentType?: string;
    posterUrl?: string | null;
    uploaderName?: string;
    uploaderId?: string;
    takenAt?: number;
    challengeId?: string | null;
  };

  if (!body.url || !isAllowedBlobUrl(body.url)) {
    return NextResponse.json({ error: "URL no válida" }, { status: 400 });
  }

  await registerMedia({
    albumId: album.id,
    url: body.url,
    pathname: body.pathname ?? null,
    contentType: body.contentType ?? null,
    posterUrl: body.posterUrl ?? null,
    uploaderName: body.uploaderName ?? null,
    uploaderId: body.uploaderId ?? null,
    takenAt: body.takenAt ?? null,
    challengeId: body.challengeId ?? null,
    approved: !album.moderationEnabled,
  });

  return NextResponse.json({ ok: true });
}
