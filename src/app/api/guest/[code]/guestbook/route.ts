import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { guestbookEntries } from "@/db/schema";
import { guardAlbum } from "@/lib/guest-guard";
import { allow, clientKey } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// Muro de mensajes: dedicatorias sin foto que cualquier invitado puede leer.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const guard = await guardAlbum(code);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const albumId = guard.album.id;

  const items = await db()
    .select({
      id: guestbookEntries.id,
      authorName: guestbookEntries.authorName,
      guestId: guestbookEntries.guestId,
      kind: guestbookEntries.kind,
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
  if (!allow(clientKey(request, "mensaje"), 10, 60_000)) {
    return NextResponse.json(
      { error: "Vas muy rápido. Espera unos segundos y vuelve a intentarlo." },
      { status: 429 },
    );
  }

  const guard = await guardAlbum(code);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const albumId = guard.album.id;

  const body = (await request.json()) as {
    authorName?: string | null;
    guestId?: string | null;
    body?: string;
    kind?: string;
  };
  // Solo hay dos tipos; cualquier otra cosa se guarda como dedicatoria.
  const kind = body.kind === "cancion" ? "cancion" : "deseo";

  const text = (body.body ?? "").trim().slice(0, 2000);
  if (!text) {
    return NextResponse.json({ error: "El mensaje está vacío" }, { status: 400 });
  }

  const [item] = await db()
    .insert(guestbookEntries)
    .values({
      albumId,
      kind,
      authorName: body.authorName?.trim().slice(0, 100) || null,
      guestId: body.guestId || null,
      body: text,
    })
    .returning({
      id: guestbookEntries.id,
      authorName: guestbookEntries.authorName,
      guestId: guestbookEntries.guestId,
      kind: guestbookEntries.kind,
      body: guestbookEntries.body,
      createdAt: guestbookEntries.createdAt,
    });

  return NextResponse.json({ item });
}
