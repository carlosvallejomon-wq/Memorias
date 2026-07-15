import { randomBytes } from 'node:crypto';
import { TRPCError } from '@trpc/server';
import { countDistinct, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { Database } from '../../db';
import { albums, chatMessages, media } from '../../db/schema';
import { protectedProcedure, publicProcedure, router } from '../trpc';

const createAlbumInput = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  eventDate: z.coerce.date(),
  location: z.string().max(300).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  isE2ee: z.boolean().default(false),
});

function generateAccessToken(): string {
  // 24 bytes -> ~32 caracteres base64url, suficiente entropía para un
  // enlace mágico que no debe ser adivinable ni siquiera por fuerza bruta.
  return randomBytes(24).toString('base64url');
}

async function requireOwnAlbum(db: Database, albumId: string, userId: string) {
  const found = await db.query.albums.findFirst({ where: eq(albums.id, albumId) });
  if (!found) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Álbum no encontrado' });
  }
  if (found.createdBy !== userId) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'No eres el propietario de este álbum' });
  }
  return found;
}

export const albumRouter = router({
  create: protectedProcedure.input(createAlbumInput).mutation(async ({ ctx, input }) => {
    const [album] = await ctx.db
      .insert(albums)
      .values({ ...input, accessToken: generateAccessToken(), createdBy: ctx.user.id })
      .returning();

    return album;
  }),

  listMine: protectedProcedure.query(({ ctx }) => {
    return ctx.db.query.albums.findMany({
      where: eq(albums.createdBy, ctx.user.id),
      orderBy: (fields, { desc }) => desc(fields.eventDate),
    });
  }),

  getById: protectedProcedure
    .input(z.object({ albumId: z.string().uuid() }))
    .query(({ ctx, input }) => requireOwnAlbum(ctx.db, input.albumId, ctx.user.id)),

  // Ruta de acceso para invitados: solo requiere el token del enlace mágico
  // o del QR, nunca una sesión de Clerk (subida sin fricción, sin registro).
  getByAccessToken: publicProcedure
    .input(z.object({ accessToken: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const album = await ctx.db.query.albums.findFirst({
        where: eq(albums.accessToken, input.accessToken),
        with: { media: true },
      });

      if (!album) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Álbum no encontrado o enlace caducado' });
      }

      return album;
    }),

  // Estadísticas para el panel de administración del organizador. Solo se
  // cuenta lo que realmente registramos (fotos, vídeos, mensajes,
  // colaboradores distintos) — no hay "visitas" porque no existe tracking
  // de páginas vistas en este esqueleto.
  stats: protectedProcedure
    .input(z.object({ albumId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await requireOwnAlbum(ctx.db, input.albumId, ctx.user.id);

      const [mediaStats] = await ctx.db
        .select({
          photos: sql<number>`count(*) filter (where ${media.type} = 'IMAGE')`,
          videos: sql<number>`count(*) filter (where ${media.type} = 'VIDEO')`,
          contributors: countDistinct(media.uploadedBy),
          lastMediaAt: sql<string | null>`max(${media.createdAt})`,
        })
        .from(media)
        .where(eq(media.albumId, input.albumId));

      const [messageStats] = await ctx.db
        .select({
          total: sql<number>`count(*)`,
          lastMessageAt: sql<string | null>`max(${chatMessages.createdAt})`,
        })
        .from(chatMessages)
        .where(eq(chatMessages.albumId, input.albumId));

      const lastActivityAt = [mediaStats?.lastMediaAt, messageStats?.lastMessageAt]
        .filter((date): date is string => Boolean(date))
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;

      return {
        totalPhotos: Number(mediaStats?.photos ?? 0),
        totalVideos: Number(mediaStats?.videos ?? 0),
        totalMessages: Number(messageStats?.total ?? 0),
        uniqueContributors: Number(mediaStats?.contributors ?? 0),
        lastActivityAt,
      };
    }),
});

export { requireOwnAlbum };
