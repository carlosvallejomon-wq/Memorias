import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { albums, media } from "@/db/schema";
import { createZipStream, type ZipSource } from "@/lib/zip-stream";
import { slugify, zipEntryName } from "@/lib/zip-names";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Descarga todas las fotos/vídeos del álbum en un ZIP. Solo para el dueño.
//
// El ZIP se va escribiendo sobre la marcha: antes se juntaba el álbum entero
// en memoria y con una boda de verdad (cientos de fotos y vídeos) el servidor
// se quedaba sin memoria antes de mandar nada.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ albumId: string }> },
) {
  const { albumId } = await params;
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const [album] = await db()
    .select()
    .from(albums)
    .where(and(eq(albums.id, albumId), eq(albums.ownerId, userId)));
  if (!album) {
    return NextResponse.json({ error: "Álbum no encontrado" }, { status: 404 });
  }

  const items = await db()
    .select()
    .from(media)
    .where(eq(media.albumId, albumId))
    .orderBy(asc(media.createdAt));

  if (items.length === 0) {
    return NextResponse.json(
      { error: "El álbum está vacío, no hay nada que descargar." },
      { status: 400 },
    );
  }

  const sources: ZipSource[] = items.map((item, i) => ({
    name: zipEntryName(i + 1, item.pathname, item.type),
    date: item.takenAt ?? item.createdAt,
    open: async () => {
      try {
        const res = await fetch(item.url);
        // Si un archivo concreto falla se salta y el resto del ZIP sigue: es
        // mejor entregar 499 fotos que ninguna.
        if (!res.ok || !res.body) return null;
        return res.body;
      } catch (err) {
        console.error("No se pudo descargar para el ZIP:", item.url, err);
        return null;
      }
    },
  }));

  const safeName = slugify(album.name) || "album";

  return new NextResponse(createZipStream(sources), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="memorias-${safeName}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
