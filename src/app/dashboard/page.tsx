import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import { desc, eq, sql } from "drizzle-orm";
import { Camera, Sparkles, Plus, Images } from "lucide-react";
import { db } from "@/db";
import { albums, media } from "@/db/schema";
import { createAlbum } from "./actions";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { userId } = await auth();

  const rows = await db()
    .select({
      id: albums.id,
      name: albums.name,
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

      <section className="glass mt-8 rounded-2xl p-5">
        <h2 className="flex items-center gap-2 font-semibold">
          <Plus size={18} className="text-teja" /> Crear un álbum nuevo
        </h2>
        <form action={createAlbum} className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input
            name="name"
            required
            placeholder="Nombre del evento (p. ej. Boda de Ana y Luis)"
            className="flex-1 rounded-lg border border-tinta/20 bg-white/80 px-3 py-2 outline-none transition focus:border-teja focus:ring-2 focus:ring-teja/20"
          />
          <input
            name="eventDate"
            type="date"
            className="rounded-lg border border-tinta/20 bg-white/80 px-3 py-2 outline-none transition focus:border-teja focus:ring-2 focus:ring-teja/20"
          />
          <button
            type="submit"
            className="shimmer rounded-lg bg-teja px-5 py-2 font-semibold text-white shadow-soft transition hover:bg-teja-oscuro"
          >
            Crear
          </button>
        </form>
      </section>

      <section className="mt-8">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-tinta/50">
            <Sparkles size={28} className="text-teja/60" />
            <p>Aún no tienes álbumes. Crea el primero arriba.</p>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {rows.map((album) => (
              <li key={album.id}>
                <Link
                  href={`/dashboard/${album.id}`}
                  className="card-interactive block rounded-2xl border border-tinta/10 bg-white p-5 shadow-soft"
                >
                  <h3 className="text-lg font-semibold">{album.name}</h3>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-tinta/60">
                    {album.eventDate
                      ? new Date(album.eventDate + "T00:00:00").toLocaleDateString(
                          "es-ES",
                          { day: "numeric", month: "long", year: "numeric" },
                        )
                      : "Sin fecha"}
                    {" · "}
                    <Images size={14} />
                    {album.mediaCount}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
