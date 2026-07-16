import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import { desc, eq, sql } from "drizzle-orm";
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
          <Link href="/" className="text-sm text-tinta/50 hover:underline">
            📸 Memorias Vivas
          </Link>
          <h1 className="text-2xl font-bold">Mis álbumes</h1>
        </div>
        <UserButton />
      </header>

      <section className="mt-8 rounded-2xl bg-arena p-5">
        <h2 className="font-semibold">Crear un álbum nuevo</h2>
        <form action={createAlbum} className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input
            name="name"
            required
            placeholder="Nombre del evento (p. ej. Boda de Ana y Luis)"
            className="flex-1 rounded-lg border border-tinta/20 bg-white px-3 py-2"
          />
          <input
            name="eventDate"
            type="date"
            className="rounded-lg border border-tinta/20 bg-white px-3 py-2"
          />
          <button
            type="submit"
            className="rounded-lg bg-teja px-5 py-2 font-semibold text-white transition hover:bg-teja-oscuro"
          >
            Crear
          </button>
        </form>
      </section>

      <section className="mt-8">
        {rows.length === 0 ? (
          <p className="text-center text-tinta/50">
            Aún no tienes álbumes. Crea el primero arriba. 🎉
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {rows.map((album) => (
              <li key={album.id}>
                <Link
                  href={`/dashboard/${album.id}`}
                  className="block rounded-2xl border border-tinta/10 bg-white p-5 shadow-sm transition hover:shadow-md"
                >
                  <h3 className="text-lg font-semibold">{album.name}</h3>
                  <p className="mt-1 text-sm text-tinta/60">
                    {album.eventDate
                      ? new Date(album.eventDate + "T00:00:00").toLocaleDateString(
                          "es-ES",
                          { day: "numeric", month: "long", year: "numeric" },
                        )
                      : "Sin fecha"}
                    {" · "}
                    {album.mediaCount}{" "}
                    {album.mediaCount === 1 ? "recuerdo" : "recuerdos"}
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
