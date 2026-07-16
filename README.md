# Memorias Vivas

Álbumes de recuerdos compartidos, con IA embebida, mapa 3D, chat en tiempo
real y cifrado de extremo a extremo opcional.

## Estructura del repositorio

```
backend/         NestJS + TypeScript + Drizzle ORM (Postgres/pgvector) + tRPC + Clerk
web-dashboard/   Next.js 15 — panel de administración del organizador
mobile/          Flutter — app móvil (ver README.md, no compilado en este entorno)
docs/            API_SPEC.md y DEPLOYMENT.md
```

Es un workspace de npm: `backend` y `web-dashboard` comparten un único
`package.json`/lockfile en la raíz, lo que permite que el dashboard importe
el tipo `AppRouter` de tRPC directamente del backend (type-safety real de
extremo a extremo, sin generación de código). `mobile` es un proyecto
Flutter independiente, con su propio `pubspec.yaml`.

## Arranque rápido

```bash
npm install                                # instala backend + web-dashboard
cd backend && cp .env.example .env         # completa las claves
docker compose up -d                       # postgres+pgvector, redis, minio
cd ..
npm run db:migrate --workspace backend
npm run start:dev --workspace backend      # API en :3000
npm run worker:dev --workspace backend     # worker de BullMQ, en otra terminal

cd web-dashboard && cp .env.example .env.local
cd .. && npm run dev --workspace web-dashboard   # dashboard en :3000 (Next)
```

Cada paquete tiene su propio README con más detalle. Empieza por
[`docs/API_SPEC.md`](docs/API_SPEC.md) para la referencia de la API y
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) para desplegar a producción.

## Estado

| Módulo | Estado |
|---|---|
| Backend (auth, esquema, media, IA, chat) | Compilado y verificado (`tsc`, migraciones generadas) |
| Panel web (álbumes, estadísticas, moderación, cifrado E2E, mapa) | Compilado y verificado (`tsc` + `next build` reales) |
| App móvil (Flutter) | Escrito contra la documentación real de cada paquete, **no compilado** — este entorno no tiene el SDK de Flutter/Dart. Ver `mobile/README.md`. |

Pendiente: pantalla de subida de invitado (en móvil y web), Dotbook/PDF,
remasterizado de imagen con IA, sistema de votación/reacciones, gestión de
invitados desde el panel.
