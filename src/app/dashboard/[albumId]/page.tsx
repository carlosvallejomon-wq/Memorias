import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { albums, media } from "@/db/schema";
import { ShareCard } from "@/components/ShareCard";
import { DeleteAlbumButton, DeleteMediaButton } from "@/components/OwnerActions";

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

  const items = await db()
    .select()
    .from(media)
    .where(eq(media.albumId, albumId))
    .orderBy(desc(media.createdAt));

  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const shareUrl = `${proto}://${host}/a/${album.shareCode}`;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/dashboard" className="text-sm text-tinta/50 hover:underline">
        ← Mis álbumes
      </Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{album.name}</h1>
          <p className="text-sm text-tinta/60">
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
            href={`/api/albums/${album.id}/download`}
            className="rounded-lg border border-tinta/20 bg-white px-4 py-2 text-sm font-semibold transition hover:bg-arena"
          >
            ⬇️ Descargar ZIP
          </a>
          <a
            href={`/api/albums/${album.id}/dotbook`}
            className="rounded-lg border border-tinta/20 bg-white px-4 py-2 text-sm font-semibold transition hover:bg-arena"
          >
            📖 Dotbook (PDF)
          </a>
          <DeleteAlbumButton albumId={album.id} albumName={album.name} />
        </div>
      </div>

      <ShareCard shareUrl={shareUrl} />

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
                className="group relative overflow-hidden rounded-xl bg-arena"
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
