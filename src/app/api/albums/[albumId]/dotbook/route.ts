import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { albums, comments, media, reactions } from "@/db/schema";
import { buildDotbookPdf, DOTBOOK_STYLES, type DotbookStyle } from "@/lib/build-dotbook";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Genera el "Dotbook digital" del álbum (PDF). Solo para el dueño.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ albumId: string }> },
) {
  const { albumId } = await params;
  const styleParam = request.nextUrl.searchParams.get("style");
  const style: DotbookStyle = DOTBOOK_STYLES.some((s) => s.id === styleParam)
    ? (styleParam as DotbookStyle)
    : "clasico";
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const [album] = await db()
    .select()
    .from(albums)
    .where(and(eq(albums.id, albumId), eq(albums.ownerId, userId)));
  if (!album) {
    return NextResponse.json({ error: "Álbum no encontrado" }, { status: 404 });
  }

  const items = await db()
    .select()
    .from(media)
    .where(eq(media.albumId, albumId))
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
    .where(eq(media.albumId, albumId))
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
    .where(eq(media.albumId, albumId));
  for (const r of allReactions) {
    reactionCountByMedia.set(r.mediaId, (reactionCountByMedia.get(r.mediaId) ?? 0) + 1);
  }

  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const baseUrl = `${proto}://${host}`;
  const shareUrl = `${baseUrl}/a/${album.shareCode}`;

  const pdfBytes = await buildDotbookPdf(
    album,
    items,
    { commentsByMedia, reactionCountByMedia, shareUrl, baseUrl },
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
