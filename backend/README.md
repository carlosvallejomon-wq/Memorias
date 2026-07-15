# Memorias Vivas — Backend

API de "Memorias Vivas" construida con **NestJS + TypeScript**, **Drizzle ORM**
sobre **PostgreSQL/pgvector**, **tRPC** para type-safety end-to-end y **Clerk**
para autenticación.

## Arranque local

```bash
cp .env.example .env      # completa CLERK_SECRET_KEY, etc.
docker compose up -d      # postgres+pgvector, redis, minio
npm install
npm run db:generate       # genera la migración SQL a partir de src/db/schema.ts
npm run db:migrate        # la aplica contra DATABASE_URL
npm run start:dev         # API (Nest + tRPC) en el puerto 3000
npm run worker:dev        # proceso de worker de BullMQ, aparte
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

Este es el esqueleto inicial: auth, esquema, tRPC, subida de media y el
pipeline de IA + reels en segundo plano. El panel de moderación/estadísticas,
el mapa 3D, el chat en tiempo real, el cifrado E2E, la app Flutter y el
dashboard de Next.js quedan como siguientes iteraciones sobre esta base.
