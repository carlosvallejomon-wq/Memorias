import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { media } from "@/db/schema";
import { guardAlbum } from "@/lib/guest-guard";
import { registerMedia } from "@/lib/register-media";
import {
  MAX_FILE_BYTES,
  MAX_ITEMS_PER_ALBUM,
  MAX_INVITATION_PHOTO_BYTES,
  MAX_ITEMS_PER_GUEST,
  MAX_POSTER_BYTES,
  formatMb,
} from "@/lib/limits";

export const dynamic = "force-dynamic";

type ClientPayload = {
  code?: string;
  uploaderName?: string;
  uploaderId?: string;
  takenAt?: number;
  challengeId?: string | null;
  /**
   * "poster" son las miniaturas de vídeo y "invitacion" las fotos que el
   * organizador pone en la invitación (la de portada y las de su galería).
   * Ninguna de las dos es un recuerdo del álbum: se guardan en Blob pero no
   * se registran, así que no salen en la galería de los invitados ni gastan
   * el cupo del álbum.
   */
  kind?: "media" | "poster" | "invitacion";
};

// Comprueba los topes antes de conceder el token: es el único momento en que
// podemos negarnos, porque después el archivo va directo del móvil a Vercel
// Blob sin pasar por nuestro servidor.
async function checkQuota(albumId: string, uploaderId: string | null | undefined) {
  const [{ n: total }] = await db()
    .select({ n: sql<number>`count(*)::int` })
    .from(media)
    .where(eq(media.albumId, albumId));

  if (total >= MAX_ITEMS_PER_ALBUM) {
    throw new Error(
      `Este álbum ya tiene ${MAX_ITEMS_PER_ALBUM} recuerdos, que es el máximo. Pídele al organizador que descargue lo que hay y cree un álbum nuevo.`,
    );
  }

  if (uploaderId) {
    const [{ n: mine }] = await db()
      .select({ n: sql<number>`count(*)::int` })
      .from(media)
      .where(and(eq(media.albumId, albumId), eq(media.uploaderId, uploaderId)));
    if (mine >= MAX_ITEMS_PER_GUEST) {
      throw new Error(
        `Ya has subido ${MAX_ITEMS_PER_GUEST} recuerdos a este álbum, que es el máximo por persona.`,
      );
    }
  }
}

// Genera tokens de subida directa a Vercel Blob para los invitados.
// Se valida que el código de álbum exista y que queden huecos libres antes de
// conceder el token.
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const payload = JSON.parse(clientPayload ?? "{}") as ClientPayload;
        if (!payload.code) throw new Error("Falta el código del álbum");

        // Mismo portero que el resto de rutas de invitado: comprueba que el
        // álbum exista, no haya caducado y, si tiene código de acceso, que
        // este navegador lo haya puesto.
        const guard = await guardAlbum(payload.code);
        if (!guard.ok) throw new Error(guard.error);
        const album = guard.album;

        const isPoster = payload.kind === "poster";
        const isInvitacion = payload.kind === "invitacion";
        if (!isPoster && !isInvitacion) await checkQuota(album.id, payload.uploaderId);

        return {
          allowedContentTypes: isPoster || isInvitacion ? ["image/jpeg", "image/png", "image/webp"] : ["image/*", "video/*"],
          maximumSizeInBytes: isPoster ? MAX_POSTER_BYTES : isInvitacion ? MAX_INVITATION_PHOTO_BYTES : MAX_FILE_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            albumId: album.id,
            kind: isPoster ? "poster" : isInvitacion ? "invitacion" : "media",
            uploaderName: payload.uploaderName ?? null,
            uploaderId: payload.uploaderId ?? null,
            takenAt: payload.takenAt ?? null,
            challengeId: payload.challengeId ?? null,
            approved: !album.moderationEnabled,
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
          kind?: "media" | "poster" | "invitacion";
          uploaderName?: string | null;
          uploaderId?: string | null;
          takenAt?: number | null;
          challengeId?: string | null;
          approved?: boolean;
        };
        // Las miniaturas las registra el cliente junto al vídeo al que
        // pertenecen, y las fotos de la invitación no son un recuerdo.
        if (!payload.albumId || payload.kind === "poster" || payload.kind === "invitacion") return;
        await registerMedia({
          albumId: payload.albumId,
          url: blob.url,
          pathname: blob.pathname,
          contentType: blob.contentType,
          uploaderName: payload.uploaderName ?? null,
          uploaderId: payload.uploaderId ?? null,
          takenAt: payload.takenAt ?? null,
          challengeId: payload.challengeId ?? null,
          approved: payload.approved ?? true,
        });
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (err) {
    console.error("Error en /api/blob-upload:", err);
    const message =
      err instanceof Error
        ? err.message
        : `No se pudo subir el archivo (máximo ${formatMb(MAX_FILE_BYTES)} por archivo)`;
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
