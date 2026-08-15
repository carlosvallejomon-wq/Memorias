import type { Metadata } from "next";
import Link from "next/link";
import { cookies, headers } from "next/headers";
import { CalendarX, BookOpen, Mail, ArrowLeft, Images } from "lucide-react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { albums } from "@/db/schema";
import { accessCookieName, hasAccess } from "@/lib/album-pin";
import { isExpired } from "@/lib/expiry";
import { isValidClientToken } from "@/lib/client-link";
import { AlbumLock } from "@/components/AlbumLock";
import { DotbookGenerator } from "@/components/DotbookGenerator";
import { LazyInvitationGenerator } from "@/components/LazyInvitationGenerator";

export const dynamic = "force-dynamic";

// Página privada: nunca en buscadores.
export const metadata: Metadata = {
  title: "Personaliza tu álbum",
  robots: { index: false, follow: false },
};

function Aviso({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-arena text-teja">
        <CalendarX size={26} />
      </span>
      <h1 className="mt-4 text-2xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
        {titulo}
      </h1>
      <p className="mt-2 text-tinta/60">{texto}</p>
    </main>
  );
}

/**
 * Donde el dueño del evento elige lo suyo, sin tener cuenta.
 *
 * Cuando el álbum lo crea una agencia o un fotógrafo, quien se casa no entra
 * al panel: no tiene usuario. Pero la portada de su libro y su invitación son
 * decisiones suyas, no de la agencia. Con el enlace firmado llega aquí y las
 * toma él, sin registrarse y sin ver nada de los demás clientes.
 */
export default async function PersonalizarPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ k?: string }>;
}) {
  const { code } = await params;
  const { k } = await searchParams;

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
      <Aviso
        titulo="Álbum no encontrado"
        texto="Comprueba el enlace, o pídele a quien organiza el evento que te lo vuelva a enviar."
      />
    );
  }

  if (isExpired(album.expiresAt)) {
    return (
      <Aviso
        titulo="Este álbum ya se ha cerrado"
        texto="Quien lo organizó puso una fecha de cierre y ya ha pasado."
      />
    );
  }

  // Los mismos porteros que el resto del álbum: primero el código de acceso,
  // si lo hay, y después el token del enlace. Sin el token esto quedaría
  // abierto a cualquier invitado que tuviera el QR.
  const cookieStore = await cookies();
  const cookie = cookieStore.get(accessCookieName(album.id))?.value;
  if (!hasAccess(album.id, album.pinHash, cookie)) {
    return <AlbumLock code={album.shareCode} albumName={album.name} />;
  }

  if (!isValidClientToken(album.id, k)) {
    return (
      <Aviso
        titulo="Este enlace no es válido"
        texto="Pídele a quien organiza tu evento que te mande otra vez el enlace para personalizar tu álbum."
      />
    );
  }

  const eventDateLabel = album.eventDate
    ? new Date(album.eventDate + "T00:00:00").toLocaleDateString("es-ES", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  // Absoluta, no relativa: este mismo texto es el que se codifica en el QR de
  // la invitación, y un "/a/loquesea" escaneado no lleva a ninguna parte.
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const shareUrl = `${proto}://${host}/a/${album.shareCode}`;
  const albumPath = `/a/${album.shareCode}`;
  const dotbookBase = `/api/guest/${album.shareCode}/dotbook?k=${k}`;

  return (
    <main className="mx-auto max-w-2xl px-5 pb-16 pt-8">
      <header className="text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-teja">Tu evento</p>
        <h1
          className="text-balance mt-1 text-3xl font-semibold"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {album.name}
        </h1>
        {eventDateLabel && <p className="mt-1 text-tinta/60">{eventDateLabel}</p>}
        <p className="mx-auto mt-4 max-w-md text-tinta/70">
          Aquí eliges tú cómo quieres tu invitación y la portada de tu libro de
          recuerdos. Puedes cambiar de idea las veces que quieras: nada se
          queda fijado.
        </p>
      </header>

      <section className="glass mt-8 rounded-2xl p-5">
        <h2 className="flex items-center gap-2 font-semibold">
          <Mail size={18} className="text-teja" /> Tu invitación
        </h2>
        <p className="mt-1 text-sm text-tinta/60">
          Elige un diseño y escribe los datos de tu evento. La invitación sale
          con el código QR de tus fotos ya incluido, listo para mandarla por
          WhatsApp.
        </p>
        <div className="mt-4">
          <LazyInvitationGenerator
            albumName={album.name}
            eventDateLabel={eventDateLabel}
            shareUrl={shareUrl}
          />
        </div>
      </section>

      <section className="glass mt-5 rounded-2xl p-5">
        <h2 className="flex items-center gap-2 font-semibold">
          <BookOpen size={18} className="text-teja" /> La portada de tu libro
        </h2>
        <p className="mt-1 text-sm text-tinta/60">
          El libro se genera con todas las fotos del álbum, una por página.
          Escoge la portada que más te guste y descárgalo; si luego prefieres
          otra, vuelves y lo descargas de nuevo.
        </p>
        <div className="mt-4">
          <DotbookGenerator albumId={album.id} downloadBase={dotbookBase} />
        </div>
      </section>

      <div className="mt-8 flex flex-col items-center gap-3">
        <Link href={albumPath} className="btn btn-soft px-4 py-2 text-sm">
          <Images size={16} /> Ver las fotos del álbum
        </Link>
        <Link href="/" className="flex items-center gap-1 text-sm text-tinta/50 hover:text-tinta">
          <ArrowLeft size={14} /> Memorias Vivas
        </Link>
      </div>
    </main>
  );
}
