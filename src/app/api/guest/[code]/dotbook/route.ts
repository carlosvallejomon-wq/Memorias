import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { albums } from "@/db/schema";
import { isValidClientToken } from "@/lib/client-link";
import { dotbookResponse, parseDotbookStyle } from "@/lib/dotbook-response";
import { guardAlbum } from "@/lib/guest-guard";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Descarga del Dotbook para el dueño del evento, sin cuenta.
 *
 * Cuando el álbum lo ha creado una agencia, el cliente no puede entrar al
 * panel. Con su enlace firmado se descarga él mismo el libro con la portada
 * que quiera.
 *
 * Dos porteros, no uno: `guardAlbum` (el de siempre, que hace valer el código
 * de acceso y la fecha de borrado) y además el token. Sin el token esto sería
 * una descarga abierta a cualquier invitado que tenga el QR, y generar un PDF
 * de doscientas páginas no es algo que convenga dejar al alcance de todos.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  const guard = await guardAlbum(code);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const token = request.nextUrl.searchParams.get("k");
  if (!isValidClientToken(guard.album.id, token)) {
    return NextResponse.json({ error: "Este enlace no es válido." }, { status: 403 });
  }

  const [album] = await db().select().from(albums).where(eq(albums.id, guard.album.id));
  if (!album) {
    return NextResponse.json({ error: "Álbum no encontrado" }, { status: 404 });
  }

  return dotbookResponse(album, parseDotbookStyle(request.nextUrl.searchParams.get("style")));
}
