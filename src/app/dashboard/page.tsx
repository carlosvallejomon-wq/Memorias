import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { CalendarDays, Images, Plus, Sparkles, Users } from "lucide-react";
import { db } from "@/db";
import { albums, challenges, guestbookEntries, media } from "@/db/schema";
import { AlbumCard, type AlbumCardData } from "@/components/AlbumCard";
import { DashboardTopBar } from "@/components/DashboardTopBar";

export const dynamic = "force-dynamic";

// Cuántas fotos se piden por álbum para montar la portada de su tarjeta.
const COVERS_PER_ALBUM = 3;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { userId } = await auth();

  const rows = await db()
    .select({
      id: albums.id,
      name: albums.name,
      kind: albums.kind,
      eventDate: albums.eventDate,
      shareCode: albums.shareCode,
      moderationEnabled: albums.moderationEnabled,
      createdAt: albums.createdAt,
      mediaCount: sql<number>`count(case when ${media.approved} then 1 end)::int`,
      pendingCount: sql<number>`count(case when not ${media.approved} then 1 end)::int`,
      peopleCount: sql<number>`count(distinct coalesce(${media.uploaderId}, ${media.uploaderName}))::int`,
    })
    .from(albums)
    .leftJoin(media, eq(media.albumId, albums.id))
    .where(eq(albums.ownerId, userId!))
    .groupBy(albums.id)
    .orderBy(desc(albums.createdAt));

  const ids = rows.map((r) => r.id);

  // Portadas, retos y mensajes en tres consultas para todos los álbumes a la
  // vez (nada de una consulta por tarjeta).
  const [coverRows, challengeRows, messageRows] = await Promise.all([
    ids.length > 0
      ? db()
          .select({
            albumId: media.albumId,
            url: media.url,
            type: media.type,
            createdAt: media.createdAt,
          })
          .from(media)
          .where(and(inArray(media.albumId, ids), eq(media.approved, true)))
          .orderBy(desc(media.createdAt))
          .limit(ids.length * 12)
      : Promise.resolve([]),
    ids.length > 0
      ? db()
          .select({ albumId: challenges.albumId, n: sql<number>`count(*)::int` })
          .from(challenges)
          .where(inArray(challenges.albumId, ids))
          .groupBy(challenges.albumId)
      : Promise.resolve([]),
    ids.length > 0
      ? db()
          .select({ albumId: guestbookEntries.albumId, n: sql<number>`count(*)::int` })
          .from(guestbookEntries)
          .where(inArray(guestbookEntries.albumId, ids))
          .groupBy(guestbookEntries.albumId)
      : Promise.resolve([]),
  ]);

  const coversByAlbum = new Map<string, { url: string; type: string }[]>();
  for (const c of coverRows) {
    const list = coversByAlbum.get(c.albumId) ?? [];
    if (list.length < COVERS_PER_ALBUM) {
      list.push({ url: c.url, type: c.type });
      coversByAlbum.set(c.albumId, list);
    }
  }
  const challengesByAlbum = new Map(challengeRows.map((r) => [r.albumId, r.n]));
  const messagesByAlbum = new Map(messageRows.map((r) => [r.albumId, r.n]));

  const cards: AlbumCardData[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    kind: r.kind,
    eventDate: r.eventDate,
    moderationEnabled: r.moderationEnabled,
    mediaCount: r.mediaCount,
    pendingCount: r.pendingCount,
    peopleCount: r.peopleCount,
    challengeCount: challengesByAlbum.get(r.id) ?? 0,
    messageCount: messagesByAlbum.get(r.id) ?? 0,
    covers: coversByAlbum.get(r.id) ?? [],
  }));

  const totals = {
    albums: cards.length,
    media: cards.reduce((s, c) => s + c.mediaCount, 0),
    people: cards.reduce((s, c) => s + c.peopleCount, 0),
    pending: cards.reduce((s, c) => s + c.pendingCount, 0),
  };

  return (
    <>
      <DashboardTopBar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        {error === "borrado" && (
          <p className="nota mb-5 rounded-xl px-4 py-3 text-sm">
            No se pudo borrar el álbum del todo. Si sigue apareciendo en la
            lista, vuelve a intentarlo; si ya no está, se borró bien.
          </p>
        )}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1
              className="text-3xl font-semibold"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Mis álbumes
            </h1>
            <p className="mt-1 text-tinta/60">
              {totals.albums === 0
                ? "Aquí aparecerán los álbumes que crees."
                : totals.pending > 0
                  ? `Tienes ${totals.pending} ${
                      totals.pending === 1 ? "foto" : "fotos"
                    } esperando tu aprobación.`
                  : "Todo al día. Comparte el QR y deja que se llenen."}
            </p>
          </div>
          {totals.albums > 0 && (
            <dl className="flex gap-3 text-center">
              {[
                { icon: CalendarDays, value: totals.albums, label: "álbumes" },
                { icon: Images, value: totals.media, label: "recuerdos" },
                { icon: Users, value: totals.people, label: "personas" },
              ].map((t) => (
                <div
                  key={t.label}
                  className="min-w-[5.5rem] rounded-2xl border border-tinta/10 bg-white px-4 py-3 shadow-soft"
                >
                  <dt className="flex items-center justify-center gap-1 text-xs text-tinta/50">
                    <t.icon size={12} /> {t.label}
                  </dt>
                  <dd
                    className="text-2xl leading-tight font-semibold"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {t.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        {cards.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-tinta/20 bg-white/60 px-6 py-14 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-teja/25 to-teja/5 text-teja shadow-soft">
              <Sparkles size={28} />
            </span>
            <h2
              className="mt-4 text-xl font-semibold"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Crea tu primer álbum
            </h2>
            <p className="mx-auto mt-2 max-w-md text-tinta/60">
              Ponle nombre y fecha, comparte el QR con tus invitados y las fotos
              empezarán a llegar solas. Tarda menos de un minuto.
            </p>
            <Link href="/dashboard/nuevo" className="btn btn-primary shimmer mt-6">
              <Plus size={18} /> Crear mi álbum
            </Link>
          </div>
        ) : (
          <>
            <ul className="mt-8 grid gap-5 sm:grid-cols-2">
              {cards.map((album) => (
                <li key={album.id}>
                  <AlbumCard album={album} />
                </li>
              ))}
            </ul>

            <Link
              href="/dashboard/nuevo"
              className="card-interactive mt-5 flex items-center justify-center gap-2.5 rounded-2xl border border-dashed border-tinta/25 bg-white/60 py-6 font-semibold text-tinta/70 transition hover:border-teja/40 hover:text-tinta"
            >
              <Plus size={20} /> Crear otro álbum
            </Link>
          </>
        )}
      </main>
    </>
  );
}
