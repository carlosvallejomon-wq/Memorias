import { randomBytes } from 'node:crypto';
import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { albums } from '../../db/schema';
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
});
