import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { albums, guestbookEntries } from "@/db/schema";

export const dynamic = "force-dynamic";

async function findAlbumId(code: string): Promise<string | null> {
  const [album] = await db()
    .select({ id: albums.id })
    .from(albums)
    .where(eq(albums.shareCode, code));
  return album?.id ?? null;
}

// Muro de mensajes: dedicatorias sin foto que cualquier invitado puede leer.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const albumId = await findAlbumId(code);
  if (!albumId) {
    return NextResponse.json({ error: "Álbum no encontrado" }, { status: 404 });
  }

  const items = await db()
    .select({
      id: guestbookEntries.id,
      authorName: guestbookEntries.authorName,
      guestId: guestbookEntries.guestId,
      body: guestbookEntries.body,
      createdAt: guestbookEntries.createdAt,
    })
    .from(guestbookEntries)
    .where(eq(guestbookEntries.albumId, albumId))
    .orderBy(desc(guestbookEntries.createdAt));

  return NextResponse.json({ items });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const albumId = await findAlbumId(code);
  if (!albumId) {
    return NextResponse.json({ error: "Álbum no encontrado" }, { status: 404 });
  }

  const body = (await request.json()) as {
    authorName?: string | null;
    guestId?: string | null;
    body?: string;
  };

  const text = (body.body ?? "").trim().slice(0, 2000);
  if (!text) {
    return NextResponse.json({ error: "El mensaje está vacío" }, { status: 400 });
  }

  const [item] = await db()
    .insert(guestbookEntries)
    .values({
      albumId,
      authorName: body.authorName?.trim().slice(0, 100) || null,
      guestId: body.guestId || null,
      body: text,
    })
    .returning({
      id: guestbookEntries.id,
      authorName: guestbookEntries.authorName,
      guestId: guestbookEntries.guestId,
      body: guestbookEntries.body,
      createdAt: guestbookEntries.createdAt,
    });

  return NextResponse.json({ item });
}
