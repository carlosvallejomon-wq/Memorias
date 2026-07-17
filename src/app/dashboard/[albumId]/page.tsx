import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { and, desc, eq } from "drizzle-orm";
import { ArrowLeft, Download, BookOpen, MonitorPlay, Hourglass } from "lucide-react";
import { db } from "@/db";
import { albums, media } from "@/db/schema";
import { ShareCard } from "@/components/ShareCard";
import { ModerationToggle } from "@/components/ModerationToggle";
import {
  ApproveMediaButton,
  DeleteAlbumButton,
  DeleteMediaButton,
  RejectMediaButton,
} from "@/components/OwnerActions";

export const dynamic = "force-dynamic";

export default async function AlbumAdminPage({
  params,
}: {
  params: Promise<{ albumId: string }>;
}) {
  const { albumId } = await params;
  const { userId } = await auth();

  const [album] = await db()
    .select()
    .from(albums)
    .where(and(eq(albums.id, albumId), eq(albums.ownerId, userId!)));
  if (!album) notFound();

  const allItems = await db()
    .select()
    .from(media)
    .where(eq(media.albumId, albumId))
    .orderBy(desc(media.createdAt));

  const pendingItems = allItems.filter((i) => !i.approved);
  const items = allItems.filter((i) => i.approved);

  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const shareUrl = `${proto}://${host}/a/${album.shareCode}`;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-tinta/50 transition hover:text-tinta"
      >
        <ArrowLeft size={15} /> Mis álbumes
      </Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1
            className="text-3xl font-semibold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {album.name}
          </h1>
          <p className="mt-1 text-sm text-tinta/60">
            {album.eventDate
              ? new Date(album.eventDate + "T00:00:00").toLocaleDateString(
                  "es-ES",
                  { day: "numeric", month: "long", year: "numeric" },
                )
              : "Sin fecha"}
            {" · "}
            {items.length} {items.length === 1 ? "recuerdo" : "recuerdos"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/a/${album.shareCode}/pantalla`}
            target="_blank"
            rel="noreferrer"
            className="shimmer flex items-center gap-2 rounded-full border border-tinta/15 bg-white px-4 py-2 text-sm font-semibold shadow-soft transition hover:bg-arena"
          >
            <MonitorPlay size={16} /> Modo pantalla
          </a>
          <a
            href={`/api/albums/${album.id}/download`}
            className="shimmer flex items-center gap-2 rounded-full border border-tinta/15 bg-white px-4 py-2 text-sm font-semibold shadow-soft transition hover:bg-arena"
          >
            <Download size={16} /> ZIP
          </a>
          <a
            href={`/api/albums/${album.id}/dotbook`}
            className="shimmer flex items-center gap-2 rounded-full border border-tinta/15 bg-white px-4 py-2 text-sm font-semibold shadow-soft transition hover:bg-arena"
          >
            <BookOpen size={16} /> Dotbook
          </a>
          <DeleteAlbumButton albumId={album.id} albumName={album.name} />
        </div>
      </div>

      <ShareCard shareUrl={shareUrl} />

      <div className="mt-6 flex justify-center sm:justify-start">
        <ModerationToggle albumId={album.id} enabled={album.moderationEnabled} />
      </div>

      {pendingItems.length > 0 && (
        <section className="mt-8 animate-fade-in rounded-2xl border border-teja/20 bg-teja/5 p-5">
          <h2 className="flex items-center gap-2 font-semibold text-teja-oscuro">
            <Hourglass size={18} />
            Pendientes de aprobar ({pendingItems.length})
          </h2>
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {pendingItems.map((item) => (
              <li
                key={item.id}
                className="card-interactive overflow-hidden rounded-xl bg-white shadow-soft"
              >
                {item.type === "video" ? (
                  <video
                    src={item.url}
                    className="aspect-square w-full object-cover"
                    preload="metadata"
                    muted
                    playsInline
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.url}
                    alt=""
                    loading="lazy"
                    className="aspect-square w-full object-cover"
                  />
                )}
                <div className="flex items-center justify-between gap-1 p-2">
                  <ApproveMediaButton mediaId={item.id} />
                  <RejectMediaButton mediaId={item.id} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <h2 className="font-semibold">Contenido del álbum</h2>
        {items.length === 0 ? (
          <p className="mt-3 text-tinta/50">
            Todavía no hay fotos. Comparte el enlace o el QR de arriba con tus
            invitados para que empiecen a subir recuerdos.
          </p>
        ) : (
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {items.map((item) => (
              <li
                key={item.id}
                className="card-interactive group relative overflow-hidden rounded-xl bg-arena shadow-soft"
              >
                {item.type === "video" ? (
                  <video
                    src={item.url}
                    className="aspect-square w-full object-cover"
                    preload="metadata"
                    muted
                    playsInline
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.url}
                    alt=""
                    loading="lazy"
                    className="aspect-square w-full object-cover"
                  />
                )}
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/60 to-transparent p-2">
                  <span className="truncate text-xs text-white">
                    {item.uploaderName || "Anónimo"}
                  </span>
                  <DeleteMediaButton mediaId={item.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
