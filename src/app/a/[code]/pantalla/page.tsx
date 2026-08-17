import { eq } from "drizzle-orm";
import { db } from "@/db";
import { albums } from "@/db/schema";
import { guardAlbum } from "@/lib/guest-guard";
import { Slideshow } from "@/components/Slideshow";
import { publicSiteUrl } from "@/lib/public-site-url";

export const dynamic = "force-dynamic";

// Vista a pantalla completa pensada para conectar a una TV o proyector en el
// propio evento: va mostrando en directo las fotos que suben los invitados.
export default async function ScreenModePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const [album] = await db()
    .select({ name: albums.name, shareCode: albums.shareCode })
    .from(albums)
    .where(eq(albums.shareCode, code));

  if (!album) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-tinta text-center text-white">
        <p>Álbum no encontrado.</p>
      </main>
    );
  }

  // La pantalla del salón es una vista más del álbum: si tiene código de
  // acceso o ya se cerró, tampoco se enseña aquí.
  const guard = await guardAlbum(code);
  if (!guard.ok) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-tinta px-6 text-center text-white">
        <p className="text-lg">{guard.error}</p>
        <a href={`/a/${album.shareCode}`} className="text-white/60 underline">
          Ir al álbum
        </a>
      </main>
    );
  }

  const shareUrl = `${publicSiteUrl()}/a/${album.shareCode}`;

  return <Slideshow code={album.shareCode} albumName={album.name} shareUrl={shareUrl} />;
}
