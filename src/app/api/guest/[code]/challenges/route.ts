import { NextResponse } from "next/server";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { challenges, media } from "@/db/schema";
import { guardAlbum } from "@/lib/guest-guard";

export const dynamic = "force-dynamic";

// Lista los retos del álbum con cuántas fotos lleva cada uno, para que el
// invitado vea de un vistazo lo que queda por hacer.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  const guard = await guardAlbum(code);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const album = guard.album;

  const rows = await db()
    .select({
      id: challenges.id,
      title: challenges.title,
      emoji: challenges.emoji,
      position: challenges.position,
      photoCount: sql<number>`count(${media.id})::int`,
    })
    .from(challenges)
    .leftJoin(
      media,
      and(eq(media.challengeId, challenges.id), eq(media.approved, true)),
    )
    .where(eq(challenges.albumId, album.id))
    .groupBy(challenges.id)
    .orderBy(asc(challenges.position), asc(challenges.createdAt));

  return NextResponse.json({ items: rows });
}
