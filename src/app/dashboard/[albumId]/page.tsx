import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import {
  ArrowLeft,
  Download,
  MonitorPlay,
  Hourglass,
  ExternalLink,
  Images,
} from "lucide-react";
import { db } from "@/db";
import { albums, challenges, comments, guestbookEntries, media, reactions } from "@/db/schema";
import { ShareCard } from "@/components/ShareCard";
import { ModerationToggle } from "@/components/ModerationToggle";
import { InvitationGenerator } from "@/components/InvitationGenerator";
import { DotbookGenerator } from "@/components/DotbookGenerator";
import { AlbumStats, type AlbumStatsData } from "@/components/AlbumStats";
import { ChallengeManager } from "@/components/ChallengeManager";
import { GuestbookPanel } from "@/components/GuestbookPanel";
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

  const [challengeRows, guestbookRows, reactionRows, commentRows] = await Promise.all([
    db()
      .select({
        id: challenges.id,
        title: challenges.title,
        emoji: challenges.emoji,
        photoCount: sql<number>`count(${media.id})::int`,
      })
      .from(challenges)
      .leftJoin(media, and(eq(media.challengeId, challenges.id), eq(media.approved, true)))
      .where(eq(challenges.albumId, albumId))
      .groupBy(challenges.id)
      .orderBy(asc(challenges.position), asc(challenges.createdAt)),
    db()
      .select({
        id: guestbookEntries.id,
        authorName: guestbookEntries.authorName,
        body: guestbookEntries.body,
        createdAt: guestbookEntries.createdAt,
      })
      .from(guestbookEntries)
      .where(eq(guestbookEntries.albumId, albumId))
      .orderBy(desc(guestbookEntries.createdAt)),
    db()
      .select({ mediaId: reactions.mediaId, n: sql<number>`count(*)::int` })
      .from(reactions)
      .innerJoin(media, eq(reactions.mediaId, media.id))
      .where(eq(media.albumId, albumId))
      .groupBy(reactions.mediaId),
    db()
      .select({ mediaId: comments.mediaId, n: sql<number>`count(*)::int` })
      .from(comments)
      .innerJoin(media, eq(comments.mediaId, media.id))
      .where(eq(media.albumId, albumId))
      .groupBy(comments.mediaId),
  ]);

  // Resumen del evento: se calcula sobre el contenido ya publicado.
  const reactionsById = new Map(reactionRows.map((r) => [r.mediaId, r.n]));
  const commentsById = new Map(commentRows.map((r) => [r.mediaId, r.n]));
  const byUploader = new Map<string, number>();
  for (const item of items) {
    const name = item.uploaderName?.trim();
    if (name) byUploader.set(name, (byUploader.get(name) ?? 0) + 1);
  }
  const topScored = items
    .map((item) => ({
      item,
      score: (reactionsById.get(item.id) ?? 0) + (commentsById.get(item.id) ?? 0),
    }))
    .sort((a, b) => b.score - a.score)[0];

  const stats: AlbumStatsData = {
    mediaCount: items.length,
    photoCount: items.filter((i) => i.type === "image").length,
    videoCount: items.filter((i) => i.type === "video").length,
    peopleCount: new Set(
      items.map((i) => i.uploaderId || i.uploaderName || "anónimo"),
    ).size,
    dayCount: new Set(
      items.map((i) => (i.takenAt ?? i.createdAt).toISOString().slice(0, 10)),
    ).size,
    reactionCount: reactionRows.reduce((sum, r) => sum + r.n, 0),
    commentCount: commentRows.reduce((sum, r) => sum + r.n, 0),
    messageCount: guestbookRows.length,
    topContributors: [...byUploader.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3),
    topMedia:
      topScored && topScored.score > 0
        ? {
            url: topScored.item.url,
            type: topScored.item.type,
            uploaderName: topScored.item.uploaderName,
            score: topScored.score,
          }
        : null,
  };

  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const shareUrl = `${proto}://${host}/a/${album.shareCode}`;
  const eventDateLabel = album.eventDate
    ? new Date(album.eventDate + "T00:00:00").toLocaleDateString("es-ES", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-tinta/50 transition hover:text-tinta"
      >
        <ArrowLeft size={15} /> Mis álbumes
      </Link>

      <section className="relative mt-4 overflow-hidden rounded-3xl border border-tinta/10 p-6 shadow-lift sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-arena via-crema to-oro/10"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-teja/15 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-vino/10 blur-3xl"
        />

        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1
              className="text-3xl font-semibold"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {album.name}
            </h1>
            <p className="mt-1 text-sm text-tinta/60">
              {eventDateLabel ?? (album.kind === "familia" ? "Álbum de familia" : "Sin fecha")}
              {" · "}
              {items.length} {items.length === 1 ? "recuerdo" : "recuerdos"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={`/a/${album.shareCode}`}
              target="_blank"
              rel="noreferrer"
              className="shimmer flex items-center gap-2 rounded-full border border-tinta/15 bg-white px-4 py-2 text-sm font-semibold shadow-soft transition hover:bg-arena"
            >
              <ExternalLink size={16} /> Ver álbum
            </a>
            <a
              href={`/a/${album.shareCode}/pantalla`}
              target="_blank"
              rel="noreferrer"
              className="shimmer flex items-center gap-2 rounded-full border border-tinta/15 bg-white px-4 py-2 text-sm font-semibold shadow-soft transition hover:bg-arena"
            >
              <MonitorPlay size={16} /> Modo pantalla
            </a>
            <InvitationGenerator
              albumName={album.name}
              eventDateLabel={eventDateLabel}
              shareUrl={shareUrl}
            />
            <a
              href={`/api/albums/${album.id}/download`}
              className="shimmer flex items-center gap-2 rounded-full border border-tinta/15 bg-white px-4 py-2 text-sm font-semibold shadow-soft transition hover:bg-arena"
            >
              <Download size={16} /> ZIP
            </a>
            <DotbookGenerator albumId={album.id} />
            <DeleteAlbumButton albumId={album.id} albumName={album.name} />
          </div>
        </div>

        <div className="relative">
          <ShareCard shareUrl={shareUrl} />
        </div>

        <div className="relative mt-6 flex justify-center sm:justify-start">
          <ModerationToggle albumId={album.id} enabled={album.moderationEnabled} />
        </div>
      </section>

      {items.length > 0 && <AlbumStats stats={stats} />}

      {pendingItems.length > 0 && (
        <section className="mt-8 animate-fade-in rounded-2xl border border-teja/20 bg-teja/5 p-5">
          <h2 className="flex items-center gap-2 font-semibold text-teja-oscuro">
            <Hourglass size={18} />
            Pendientes de aprobar ({pendingItems.length})
          </h2>
          <ul className="mt-3 columns-2 gap-3 sm:columns-3 md:columns-4">
            {pendingItems.map((item) => (
              <li
                key={item.id}
                className="card-interactive mb-3 break-inside-avoid overflow-hidden rounded-xl bg-white shadow-soft"
              >
                {item.type === "video" ? (
                  <video src={item.url} className="block w-full" preload="metadata" muted playsInline />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.url} alt="" loading="lazy" className="block w-full" />
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

      <ChallengeManager albumId={album.id} challenges={challengeRows} />

      <GuestbookPanel entries={guestbookRows} />

      <section className="mt-8">
        <h2 className="flex items-center gap-2 font-semibold">
          <Images size={18} className="text-teja" /> Contenido del álbum
          {items.length > 0 && (
            <span className="font-normal text-tinta/40">({items.length})</span>
          )}
        </h2>
        {items.length === 0 ? (
          <p className="mt-3 text-tinta/50">
            Todavía no hay fotos. Comparte el enlace o el QR de arriba con tus
            invitados para que empiecen a subir recuerdos.
          </p>
        ) : (
          <ul className="mt-3 columns-2 gap-3 sm:columns-3 md:columns-4">
            {items.map((item) => (
              <li
                key={item.id}
                className="card-interactive group relative mb-3 break-inside-avoid overflow-hidden rounded-xl bg-arena shadow-soft"
              >
                {item.type === "video" ? (
                  <video src={item.url} className="block w-full" preload="metadata" muted playsInline />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.url} alt="" loading="lazy" className="block w-full" />
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
