import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { albums } from "@/db/schema";
import { accessCookieName, accessCookieValue, verifyPin } from "@/lib/album-pin";
import { allow, clientKey } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// Comprueba el código de acceso de un álbum y, si es correcto, deja una
// cookie firmada para que este móvil no lo tenga que teclear otra vez.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  // Un código de 4 dígitos se adivina a fuerza bruta en un rato; esto lo
  // convierte en horas.
  if (!allow(clientKey(request, `acceso:${code}`), 10, 5 * 60_000)) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera unos minutos y vuelve a probar." },
      { status: 429 },
    );
  }

  const body = (await request.json()) as { pin?: string };

  const [album] = await db()
    .select({ id: albums.id, pinHash: albums.pinHash })
    .from(albums)
    .where(eq(albums.shareCode, code));
  if (!album) {
    return NextResponse.json({ error: "Álbum no encontrado" }, { status: 404 });
  }
  if (!album.pinHash) {
    return NextResponse.json({ ok: true });
  }

  if (!verifyPin((body.pin ?? "").trim(), album.pinHash)) {
    return NextResponse.json({ error: "Ese código no es correcto." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(accessCookieName(album.id), accessCookieValue(album.id, album.pinHash), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
