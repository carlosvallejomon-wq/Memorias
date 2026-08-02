import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { albums } from "@/db/schema";
import { accessCookieName, hasAccess } from "@/lib/album-pin";
import { isExpired } from "@/lib/expiry";

export type GuestAlbum = {
  id: string;
  moderationEnabled: boolean;
};

export type GuardResult =
  | { ok: true; album: GuestAlbum }
  | { ok: false; status: number; error: string };

/**
 * Busca el álbum por su código y comprueba que este navegador pueda verlo.
 *
 * Lo usan TODAS las rutas de invitado. Sin esto, el código de acceso solo
 * taparía la pantalla: cualquiera podría pedir la lista de fotos a mano y
 * verlas igual.
 */
export async function guardAlbum(code: string): Promise<GuardResult> {
  const [album] = await db()
    .select({
      id: albums.id,
      moderationEnabled: albums.moderationEnabled,
      pinHash: albums.pinHash,
      expiresAt: albums.expiresAt,
    })
    .from(albums)
    .where(eq(albums.shareCode, code));

  if (!album) return { ok: false, status: 404, error: "Álbum no encontrado" };

  if (isExpired(album.expiresAt)) {
    return { ok: false, status: 410, error: "Este álbum ya se ha cerrado." };
  }

  if (album.pinHash) {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(accessCookieName(album.id))?.value;
    if (!hasAccess(album.id, album.pinHash, cookie)) {
      return { ok: false, status: 401, error: "Este álbum pide un código de acceso." };
    }
  }

  return {
    ok: true,
    album: { id: album.id, moderationEnabled: album.moderationEnabled },
  };
}
