import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { albums } from "@/db/schema";
import { registerMedia } from "@/lib/register-media";

export const dynamic = "force-dynamic";

// Genera tokens de subida directa a Vercel Blob para los invitados.
// Se valida que el código de álbum exista antes de conceder el token.
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const payload = JSON.parse(clientPayload ?? "{}") as {
          code?: string;
          uploaderName?: string;
          takenAt?: number;
        };
        if (!payload.code) throw new Error("Falta el código del álbum");

        const [album] = await db()
          .select({ id: albums.id })
          .from(albums)
          .where(eq(albums.shareCode, payload.code));
        if (!album) throw new Error("El álbum no existe");

        return {
          allowedContentTypes: ["image/*", "video/*"],
          maximumSizeInBytes: 500 * 1024 * 1024, // 500 MB por archivo
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            albumId: album.id,
            uploaderName: payload.uploaderName ?? null,
            takenAt: payload.takenAt ?? null,
          }),
        };
      },
      // En producción Vercel llama a este webhook al terminar la subida.
      // El cliente también registra el archivo por su cuenta (por si este
      // webhook no llega, p. ej. en local); la tabla tiene la URL como
      // única, así que registrar dos veces no duplica nada.
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const payload = JSON.parse(tokenPayload ?? "{}") as {
          albumId?: string;
          uploaderName?: string | null;
          takenAt?: number | null;
        };
        if (!payload.albumId) return;
        await registerMedia({
          albumId: payload.albumId,
          url: blob.url,
          pathname: blob.pathname,
          contentType: blob.contentType,
          uploaderName: payload.uploaderName ?? null,
          takenAt: payload.takenAt ?? null,
        });
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (err) {
    console.error("Error en /api/blob-upload:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}
