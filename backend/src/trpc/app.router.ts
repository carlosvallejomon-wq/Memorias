import { router } from './trpc';
import { albumRouter } from './routers/album.router';

export const appRouter = router({
  album: albumRouter,
});

// Tipo exportado para que el frontend (Next.js) y el móvil (mediante
// generación de tipos) obtengan type-safety end-to-end sin duplicar contratos.
export type AppRouter = typeof appRouter;
