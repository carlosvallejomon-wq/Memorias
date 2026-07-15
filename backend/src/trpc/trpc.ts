import { initTRPC, TRPCError } from '@trpc/server';
import type { TrpcContext } from './trpc.context';

const t = initTRPC.context<TrpcContext>().create();

export const router = t.router;
export const middleware = t.middleware;

// Procedimiento público: usado por invitados que acceden solo con el
// accessToken del enlace mágico / QR, sin sesión de Clerk.
export const publicProcedure = t.procedure;

// Procedimiento protegido: exige un usuario ya aprovisionado en la tabla
// `users` local (ver AuthService.findOrCreateUser). Estrecha `ctx.user` a
// no-nulo para el resto de la cadena de resolvers.
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Debes iniciar sesión para realizar esta acción' });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});
