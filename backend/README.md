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
npm run start:dev
```

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

Este es el esqueleto inicial (auth + esquema + tRPC + subida de media). El
pipeline de IA (Replicate/Hugging Face) y los workers de BullMQ se añaden
como siguientes iteraciones sobre esta base.
