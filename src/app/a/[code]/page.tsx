import { eq } from "drizzle-orm";
import { db } from "@/db";
import { albums } from "@/db/schema";
import { GuestAlbum } from "@/components/GuestAlbum";

export const dynamic = "force-dynamic";

export default async function GuestAlbumPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
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
    />
  );
}
