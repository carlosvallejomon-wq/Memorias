import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import { albums } from "@/db/schema";
import { Slideshow } from "@/components/Slideshow";

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

  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const shareUrl = `${proto}://${host}/a/${album.shareCode}`;

  return <Slideshow code={album.shareCode} albumName={album.name} shareUrl={shareUrl} />;
}
