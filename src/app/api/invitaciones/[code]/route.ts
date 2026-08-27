import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { albums, invitations } from "@/db/schema";
import { isValidClientToken } from "@/lib/client-link";
import { isExpired } from "@/lib/expiry";
import { parseInvitationState } from "@/lib/invitation-link";
import { allow, clientKey } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Tope del JSON guardado. Lo normal ronda los 2 KB; esto es holgado. */
const MAX_BYTES = 32 * 1024;

/**
 * Guarda la invitación que está preparando el organizador.
 *
 * No pasa por Clerk a propósito: la usan tanto el panel como la pantalla de
 * `/a/[code]/personalizar`, donde el dueño del evento es un cliente de una
 * agencia y no tiene cuenta. El permiso lo da el mismo token firmado del
 * enlace privado (`clientToken`), que no se puede adivinar y que el panel
 * calcula por su cuenta.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  if (!allow(clientKey(request, "guardar-invitacion"), 30, 60_000)) {
    return NextResponse.json({ error: "Espera un momento antes de volver a guardar." }, { status: 429 });
  }

  const [album] = await db()
    .select({ id: albums.id, expiresAt: albums.expiresAt })
    .from(albums)
    .where(eq(albums.shareCode, code))
    .limit(1);
  if (!album) return NextResponse.json({ error: "Este álbum no existe." }, { status: 404 });
  if (isExpired(album.expiresAt)) {
    return NextResponse.json({ error: "Este álbum ya se ha cerrado." }, { status: 410 });
  }

  const body = (await request.json()) as { k?: string; data?: unknown };
  if (!isValidClientToken(album.id, body.k)) {
    return NextResponse.json({ error: "No tienes permiso para editar esta invitación." }, { status: 403 });
  }

  const state = parseInvitationState(body.data);
  if (!state) return NextResponse.json({ error: "La invitación está incompleta." }, { status: 400 });
  if (JSON.stringify(state).length > MAX_BYTES) {
    return NextResponse.json({ error: "La invitación es demasiado grande." }, { status: 413 });
  }

  await db()
    .insert(invitations)
    .values({ albumId: album.id, data: state })
    .onConflictDoUpdate({
      target: invitations.albumId,
      set: { data: state, updatedAt: new Date() },
    });

  return NextResponse.json({ ok: true });
}
