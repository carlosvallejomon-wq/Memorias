import type { Metadata } from "next";
import { cookies } from "next/headers";
import { CalendarX } from "lucide-react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { albums } from "@/db/schema";
import { accessCookieName, hasAccess } from "@/lib/album-pin";
import { isExpired } from "@/lib/expiry";
import { AlbumLock } from "@/components/AlbumLock";
import { GuestAlbum } from "@/components/GuestAlbum";

export const dynamic = "force-dynamic";

// Título y descripción del enlace cuando el organizador lo manda por
// WhatsApp. La imagen la genera opengraph-image.tsx con las fotos del álbum.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const [album] = await db()
    .select({ name: albums.name, eventDate: albums.eventDate })
    .from(albums)
    .where(eq(albums.shareCode, code));

  if (!album) return { title: "Álbum no encontrado" };

  const fecha = album.eventDate
    ? new Date(album.eventDate + "T00:00:00").toLocaleDateString("es-ES", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;
  const descripcion = fecha
    ? `${fecha} · Añade tus fotos y vídeos al álbum. Sin instalar nada y sin registrarte.`
    : "Añade tus fotos y vídeos al álbum. Sin instalar nada y sin registrarte.";

  return {
    title: album.name,
    description: descripcion,
    openGraph: { title: album.name, description: descripcion, type: "website" },
    // Un álbum privado no debería aparecer en Google: solo entra quien tiene
    // el enlace.
    robots: { index: false, follow: false },
  };
}

export default async function GuestAlbumPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ panel?: string }>;
}) {
  const { code } = await params;
  // El organizador llega aquí desde su panel con ?panel=1; solo en ese caso
  // se le ofrece la vuelta atrás (un invitado normal no tiene panel).
  const { panel } = await searchParams;
  const [album] = await db()
    .select({
      id: albums.id,
      name: albums.name,
      eventDate: albums.eventDate,
      shareCode: albums.shareCode,
      pinHash: albums.pinHash,
      expiresAt: albums.expiresAt,
    })
    .from(albums)
    .where(eq(albums.shareCode, code));

  if (!album) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
        <p className="text-5xl">🔍</p>
        <h1 className="mt-4 text-2xl font-bold">Álbum no encontrado</h1>
        <p className="mt-2 text-tinta/60">
          Comprueba que el enlace o el código QR sean correctos, o pídele al
          organizador que te lo vuelva a enviar.
        </p>
      </main>
    );
  }

  // Si el organizador puso fecha de borrado y ya pasó, el álbum se cierra
  // aunque la limpieza automática todavía no haya llegado a él.
  if (isExpired(album.expiresAt)) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-arena text-teja">
          <CalendarX size={26} />
        </span>
        <h1
          className="mt-4 text-2xl font-semibold"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Este álbum ya se ha cerrado
        </h1>
        <p className="mt-2 text-tinta/60">
          Quien lo organizó puso una fecha de cierre y ya ha pasado. Si
          necesitas alguna foto, pídesela directamente.
        </p>
      </main>
    );
  }

  // El código de acceso se comprueba aquí, en el servidor. Si solo lo mirara
  // el navegador bastaría con pedir la lista de fotos a mano para saltárselo.
  const cookieStore = await cookies();
  const cookie = cookieStore.get(accessCookieName(album.id))?.value;
  if (!hasAccess(album.id, album.pinHash, cookie)) {
    return <AlbumLock code={album.shareCode} albumName={album.name} />;
  }

  return (
    <GuestAlbum
      code={album.shareCode}
      name={album.name}
      eventDate={album.eventDate}
      expiresAt={album.expiresAt ? album.expiresAt.toISOString() : null}
      fromPanel={panel === "1"}
    />
  );
}
