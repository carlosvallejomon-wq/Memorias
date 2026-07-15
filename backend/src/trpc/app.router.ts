import { router } from './trpc';
import { albumRouter } from './routers/album.router';
import { mediaRouter } from './routers/media.router';

export const appRouter = router({
  album: albumRouter,
  media: mediaRouter,
});

// Tipo exportado para que el frontend (Next.js) y el móvil (mediante
// generación de tipos) obtengan type-safety end-to-end sin duplicar contratos.
export type AppRouter = typeof appRouter;
