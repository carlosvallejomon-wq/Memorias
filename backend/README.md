# Memorias Vivas — Backend

API de "Memorias Vivas" construida con **NestJS + TypeScript**, **Drizzle ORM**
sobre **PostgreSQL/pgvector**, **tRPC** para type-safety end-to-end y **Clerk**
para autenticación.

## Arranque local

Este paquete forma parte de un workspace de npm (ver `package.json` en la
raíz del repo, junto a `/web-dashboard`) — instala siempre desde la raíz.

```bash
cp .env.example .env             # completa CLERK_SECRET_KEY, etc. (desde /backend)
docker compose up -d             # postgres+pgvector, redis, minio (desde /backend)
npm install                      # desde la raíz del repo
npm run db:generate --workspace backend   # genera la migración a partir de src/db/schema.ts
npm run db:migrate --workspace backend    # la aplica contra DATABASE_URL
npm run start:dev --workspace backend     # API (Nest + tRPC) en el puerto 3000
npm run worker:dev --workspace backend    # proceso de worker de BullMQ, aparte
```

El worker requiere `ffmpeg` instalado en el sistema (lo trae cualquier imagen
Docker de producción; en local instálalo con tu gestor de paquetes) para
generar los highlight reels.

## Estructura

- `src/db/schema.ts` — esquema Drizzle (usuarios, álbumes, media, chat) con
  relaciones, índices y la columna `embedding` (pgvector) para búsqueda semántica.
- `src/auth/` — `ClerkAuthGuard` (verifica el JWT de sesión de Clerk) y
  `AuthService` (aprovisionamiento just-in-time del usuario local).
- `src/trpc/` — router de tRPC montado en `/trpc`; `protectedProcedure` exige
  sesión, `publicProcedure` se usa para el acceso de invitados vía
  `accessToken` (enlace mágico / QR).
- `src/storage/` — cliente S3 (compatible con MinIO/R2/AWS) y generación de
  URLs firmadas de subida directa. `media.router.ts` expone el flujo en dos
  pasos: `requestUploadUrl` (firma la subida) → el cliente sube el binario
  directamente al bucket → `confirmUpload` (registra el `media` en el álbum).
  Ambos procedimientos son públicos: los invitados suben contenido solo con
  el `accessToken` del enlace mágico/QR, sin registro.
- `src/ai/` — `replicate.ts` (cliente genérico de predicciones de Replicate,
  con polling) y `face-recognition.service.ts` (detección de rostros +
  embedding semántico de cada foto, para la búsqueda "foto de la abuela en
  la playa" contra `pgvector`). `reel-generator.ts` usa `ffmpeg` para montar
  un vídeo resumen a partir de una selección de fotos del álbum.
- `src/queue/` — colas de BullMQ sobre Redis: `media-processing` (se encola
  automáticamente al confirmar cada subida de imagen), `reel-generation`
  (genera el highlight reel de un álbum) y `reel-scheduler` (job repetitivo
  semanal que decide qué álbumes tienen actividad reciente). `src/worker.ts`
  es el proceso independiente que las consume — se despliega aparte de la
  API (`src/main.ts`) para escalarlos por separado.
- `src/chat/` — `ChatGateway` (WebSockets vía Socket.IO, namespace `/chat`):
  cada álbum es una room identificada por su id; el cliente se une con
  `join { accessToken }` y envía mensajes con `message { accessToken, content,
  guestName?, authToken?, isEphemeral? }`. Los mensajes efímeros se autoborran
  a las 24h mediante un job de BullMQ con delay (`chat-cleanup`, ver
  `src/queue/workers/chat-cleanup.worker.ts`). `redis-io.adapter.ts` conecta
  Socket.IO al adapter de Redis para que los broadcasts lleguen a los
  clientes conectados a cualquier réplica de la API, no solo a la que
  recibió el mensaje.

Este es el esqueleto inicial: auth, esquema, tRPC, subida de media, el
pipeline de IA + reels en segundo plano, y el chat en tiempo real. El panel
de moderación/estadísticas, el mapa 3D, el cifrado E2E, la app Flutter y el
dashboard de Next.js quedan como siguientes iteraciones sobre esta base.
