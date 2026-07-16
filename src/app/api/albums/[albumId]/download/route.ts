import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { and, asc, eq } from "drizzle-orm";
import JSZip from "jszip";
import { db } from "@/db";
import { albums, media } from "@/db/schema";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Descarga todas las fotos/vídeos del álbum en un ZIP. Solo para el dueño.
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

  const zip = new JSZip();
  let index = 1;
  for (const item of items) {
    const res = await fetch(item.url);
    if (!res.ok) continue;
    const buffer = Buffer.from(await res.arrayBuffer());
    const original =
      item.pathname?.split("/").pop() ??
      `recuerdo-${index}${item.type === "video" ? ".mp4" : ".jpg"}`;
    const prefix = String(index).padStart(3, "0");
    zip.file(`${prefix}-${original}`, buffer);
    index += 1;
  }

  const content = await zip.generateAsync({
    type: "nodebuffer",
    compression: "STORE", // fotos/vídeos ya vienen comprimidos
  });

  const safeName = album.name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return new NextResponse(new Uint8Array(content), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="memorias-${safeName || "album"}.zip"`,
    },
  });
}
