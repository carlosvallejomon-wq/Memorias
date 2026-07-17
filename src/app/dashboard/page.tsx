import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import { desc, eq, sql } from "drizzle-orm";
import { Camera, Sparkles, Images, Users, CalendarHeart, Wand2 } from "lucide-react";
import { db } from "@/db";
import { albums, media } from "@/db/schema";
import { createAlbum } from "./actions";
import { AlbumKindPicker } from "@/components/AlbumKindPicker";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { userId } = await auth();

  const rows = await db()
    .select({
      id: albums.id,
      name: albums.name,
      kind: albums.kind,
      eventDate: albums.eventDate,
      shareCode: albums.shareCode,
      createdAt: albums.createdAt,
      mediaCount: sql<number>`count(${media.id})::int`,
    })
    .from(albums)
    .leftJoin(media, eq(media.albumId, albums.id))
    .where(eq(albums.ownerId, userId!))
    .groupBy(albums.id)
    .orderBy(desc(albums.createdAt));

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="flex items-center justify-between">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-tinta/50 transition hover:text-tinta"
          >
            <Camera size={15} /> Memorias Vivas
          </Link>
          <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
            Mis álbumes
          </h1>
        </div>
        <UserButton />
      </header>

      <section className="relative mt-8 overflow-hidden rounded-3xl border border-tinta/10 p-6 shadow-lift sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-arena via-crema to-oro/10"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-teja/15 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-vino/10 blur-3xl"
        />

        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-teja/25 to-teja/10 text-teja-oscuro shadow-soft">
              <Wand2 size={22} />
            </div>
            <div>
              <h2
                className="text-xl font-semibold"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Crea tu álbum
              </h2>
              <p className="text-sm text-tinta/60">
                Listo en menos de un minuto — comparte el QR y empieza a recibir fotos.
              </p>
            </div>
          </div>

          <form action={createAlbum} className="mt-6 flex flex-col gap-4">
            <input
              name="name"
              required
              placeholder="Nombre del evento o de la familia (p. ej. Boda de Ana y Luis)"
              className="rounded-xl border border-tinta/15 bg-white/80 px-4 py-3 text-base outline-none transition focus:border-teja focus:ring-2 focus:ring-teja/20"
            />
            <AlbumKindPicker />
            <button
              type="submit"
              className="shimmer flex items-center justify-center gap-2 self-start rounded-full bg-teja px-7 py-3 font-semibold text-white shadow-lift transition hover:bg-teja-oscuro"
            >
              <Sparkles size={16} /> Crear álbum
            </button>
          </form>
        </div>
      </section>

      <section className="mt-8">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-tinta/50">
            <Sparkles size={28} className="text-teja/60" />
            <p>Aún no tienes álbumes. Crea el primero arriba.</p>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {rows.map((album) => {
              const KindIcon = album.kind === "familia" ? Users : CalendarHeart;
              return (
                <li key={album.id}>
                  <Link
                    href={`/dashboard/${album.id}`}
                    className="card-interactive block rounded-2xl border border-tinta/10 bg-white p-5 shadow-soft"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br shadow-soft ${
                          album.kind === "familia"
                            ? "from-vino/20 to-vino/5 text-vino"
                            : "from-teja/20 to-teja/5 text-teja-oscuro"
                        }`}
                      >
                        <KindIcon size={17} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-lg font-semibold">{album.name}</h3>
                        <p className="mt-0.5 flex items-center gap-1.5 text-sm text-tinta/60">
                          {album.eventDate
                            ? new Date(album.eventDate + "T00:00:00").toLocaleDateString(
                                "es-ES",
                                { day: "numeric", month: "long", year: "numeric" },
                              )
                            : album.kind === "familia"
                              ? "Álbum continuo"
                              : "Sin fecha"}
                          {" · "}
                          <Images size={14} />
                          {album.mediaCount}
                        </p>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
