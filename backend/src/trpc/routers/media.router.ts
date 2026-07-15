import { randomUUID } from 'node:crypto';
import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { Database } from '../../db';
import { albums, media } from '../../db/schema';
import { mediaProcessingQueue } from '../../queue/queues';
import { createPresignedUploadUrl, publicUrlFor } from '../../storage';
import { publicProcedure, router } from '../trpc';

// Extensiones de imagen/vídeo soportadas por el álbum (sección 2 del spec:
// JPG/PNG/HEIC y MP4/MOV). Mapear aquí también sirve de lista blanca de
// content-types aceptados, evitando que se firmen subidas arbitrarias.
const ALLOWED_CONTENT_TYPES: Record<string, { mediaType: 'IMAGE' | 'VIDEO'; extension: string }> = {
  'image/jpeg': { mediaType: 'IMAGE', extension: 'jpg' },
  'image/png': { mediaType: 'IMAGE', extension: 'png' },
  'image/heic': { mediaType: 'IMAGE', extension: 'heic' },
  'video/mp4': { mediaType: 'VIDEO', extension: 'mp4' },
  'video/quicktime': { mediaType: 'VIDEO', extension: 'mov' },
};

async function requireAlbumByAccessToken(db: Database, accessToken: string) {
  const album = await db.query.albums.findFirst({ where: eq(albums.accessToken, accessToken) });
  if (!album) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Álbum no encontrado o enlace caducado' });
  }
  return album;
}

export const mediaRouter = router({
  // Paso 1 de la subida sin fricción: cualquiera con el enlace mágico/QR del
  // álbum (sin sesión, sin registro) pide una URL firmada de subida directa.
  requestUploadUrl: publicProcedure
    .input(
      z.object({
        accessToken: z.string().min(1),
        contentType: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const allowed = ALLOWED_CONTENT_TYPES[input.contentType];
      if (!allowed) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Tipo de archivo no soportado: ${input.contentType}`,
        });
      }

      const album = await requireAlbumByAccessToken(ctx.db, input.accessToken);
      const key = `albums/${album.id}/${randomUUID()}.${allowed.extension}`;
      const uploadUrl = await createPresignedUploadUrl(key, input.contentType);

      return { uploadUrl, key, mediaType: allowed.mediaType };
    }),

  // Paso 2: una vez el binario ya está en el bucket, se registra el `media`
  // para que aparezca en el álbum. La fecha EXIF y la miniatura las aporta
  // el cliente (o un worker de post-proceso más adelante).
  confirmUpload: publicProcedure
    .input(
      z.object({
        accessToken: z.string().min(1),
        key: z.string().min(1),
        mediaType: z.enum(['IMAGE', 'VIDEO']),
        exifDate: z.coerce.date().optional(),
        description: z.string().max(2000).optional(),
        guestName: z.string().max(100).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const album = await requireAlbumByAccessToken(ctx.db, input.accessToken);

      const [created] = await ctx.db
        .insert(media)
        .values({
          albumId: album.id,
          type: input.mediaType,
          url: publicUrlFor(input.key),
          exifDate: input.exifDate,
          description: input.description,
          uploadedBy: input.guestName,
        })
        .returning();

      // El reconocimiento facial y el embedding semántico se generan en
      // segundo plano: no bloqueamos la confirmación de la subida por ello.
      if (created.type === 'IMAGE') {
        await mediaProcessingQueue.add('detect-faces', { mediaId: created.id });
      }

      return created;
    }),
});
