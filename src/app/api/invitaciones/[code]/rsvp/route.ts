import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { albums, invitationRsvps } from "@/db/schema";
import { allow, clientKey } from "@/lib/rate-limit";
import { ensureInvitationSchema } from "@/db/ensure-invitation-schema";

export const dynamic = "force-dynamic";

// La invitación es pública por diseño. El código del álbum es aleatorio y
// este endpoint solo permite añadir una respuesta, nunca leer fotos ni la
// lista de invitados.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  if (!allow(clientKey(request, "rsvp"), 8, 60_000)) {
    return NextResponse.json({ error: "Espera un momento antes de volver a intentarlo." }, { status: 429 });
  }

  const [album] = await db().select({ id: albums.id }).from(albums).where(eq(albums.shareCode, code)).limit(1);
  if (!album) return NextResponse.json({ error: "Esta invitación no existe." }, { status: 404 });

  const body = (await request.json()) as { name?: string; attending?: boolean; partySize?: number; note?: string };
  const name = (body.name ?? "").trim().slice(0, 100);
  if (!name || typeof body.attending !== "boolean") return NextResponse.json({ error: "Completa tu nombre y respuesta." }, { status: 400 });
  const partySize = body.attending ? Math.min(20, Math.max(1, Math.floor(Number(body.partySize) || 1))) : 0;

  await ensureInvitationSchema();
  await db().insert(invitationRsvps).values({
    albumId: album.id,
    guestName: name,
    attending: body.attending,
    partySize,
    note: (body.note ?? "").trim().slice(0, 300) || null,
  });
  return NextResponse.json({ ok: true });
}
