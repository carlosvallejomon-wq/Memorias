# Memorias Vivas — Panel de administración

Next.js 15 (App Router) + TailwindCSS + Clerk + tRPC. Panel para el
organizador de un álbum: crear álbumes, ver estadísticas y moderar contenido.

## Arranque local

Requiere que `../backend` esté corriendo (`npm run start:dev` desde `/backend`).

```bash
cp .env.example .env.local   # completa las claves de Clerk
npm install                  # desde la raíz del repo (workspaces)
npm run dev --workspace web-dashboard
```

## Estructura

- `middleware.ts` — protege `/dashboard/*` con `clerkMiddleware`; el resto de
  rutas quedan públicas (la landing).
- `src/lib/trpc.ts` — cliente vanilla de tRPC (`createTRPCProxyClient`)
  tipado contra `AppRouter` del backend vía el alias de TS
  `memorias-backend/*` (import de solo-tipos: no se empaqueta código del
  backend en el frontend). Cada request adjunta el JWT de sesión de Clerk
  como `Authorization: Bearer`.
- `src/app/dashboard/page.tsx` — lista de álbumes del organizador + alta de
  álbum nuevo.
- `src/app/dashboard/[albumId]/page.tsx` — estadísticas (fotos, vídeos,
  mensajes, colaboradores distintos — no hay "visitas" porque el backend no
  trackea page views) y grid de moderación con borrado de contenido.

No incluye aún: gestión de invitados, generación de QR desde el panel, ni el
mapa 3D (ver tareas pendientes del roadmap).
