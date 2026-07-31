import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { albums } from "@/db/schema";
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
      name: albums.name,
      eventDate: albums.eventDate,
      shareCode: albums.shareCode,
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

  return (
    <GuestAlbum
      code={album.shareCode}
      name={album.name}
      eventDate={album.eventDate}
      fromPanel={panel === "1"}
    />
  );
}
