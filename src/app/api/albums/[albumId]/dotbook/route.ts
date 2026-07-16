import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { albums, comments, media } from "@/db/schema";
import { buildDotbookPdf } from "@/lib/build-dotbook";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Genera el "Dotbook digital" del álbum (PDF). Solo para el dueño.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ albumId: string }> },
) {
  const { albumId } = await params;
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

  const topCommentByMedia = new Map<string, string>();
  const allComments = await db()
    .select({ mediaId: comments.mediaId, body: comments.body })
    .from(comments)
    .innerJoin(media, eq(comments.mediaId, media.id))
    .where(eq(media.albumId, albumId));
  for (const c of allComments) {
    if (!topCommentByMedia.has(c.mediaId)) topCommentByMedia.set(c.mediaId, c.body);
  }

  const pdfBytes = await buildDotbookPdf(album, items, topCommentByMedia);

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
