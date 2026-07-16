# Despliegue a producción

## Antes de nada: qué va dónde, y por qué

El spec original pedía "Vercel + Neon + Cloudflare R2" para todo. Eso es exacto para
**`/web-dashboard`**, pero no para **`/backend`**: Vercel ejecuta funciones serverless
de vida corta, y `/backend` tiene tres cosas que necesitan un proceso Node persistente:

- El **gateway de WebSockets** del chat (`src/chat/`) — una función serverless no
  mantiene una conexión abierta.
- Los **workers de BullMQ** (`src/worker.ts`) — consumen colas en bucle, indefinidamente.
- El límite de duración de las funciones de Vercel no encaja con el reconocimiento
  facial o la generación de reels, que pueden tardar más de lo que permite un handler
  serverless típico.

Así que la arquitectura de despliegue real es:

| Componente | Dónde | Por qué |
|---|---|---|
| `web-dashboard` | **Vercel** | Next.js — encaja exactamente en lo que Vercel está diseñado para servir. |
| `backend` (API + WebSocket) | **Railway / Render / Fly.io** (contenedor Docker, proceso persistente) | Necesita mantener conexiones abiertas y procesos de larga duración. |
| `backend` worker (`worker.ts`) | Mismo proveedor que el backend, como **segundo servicio/proceso** | Se escala por separado de la API a propósito (ver `src/worker.ts`). |
| Postgres + pgvector | **Neon** | Serverless, branching instantáneo, pgvector soportado nativamente. |
| Redis (BullMQ) | **Upstash** (o Redis gestionado del mismo proveedor que el backend) | Compatible con conexiones serverless y con el proceso persistente del worker. |
| Almacenamiento de media | **Cloudflare R2** | S3-compatible, sin coste de salida de datos — tal cual pide el spec. |
| Auth | **Clerk** (SaaS, nada que desplegar) | — |
| IA | **Replicate** (SaaS, nada que desplegar) | — |

A continuación, el paso a paso por componente.

## 1. Base de datos — Neon

1. Crea un proyecto en Neon y una base de datos.
2. Habilita la extensión `pgvector`: en el SQL Editor de Neon, ejecuta:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
   (Es el mismo `docker/init-pgvector.sql` que se usa en local, pero Neon no
   ejecuta scripts de init automáticamente — hay que correrlo a mano una vez.)
3. Copia el connection string (modo *pooled*, para el runtime del backend) como `DATABASE_URL`.
4. Aplica las migraciones desde tu máquina o un job de CI apuntando a Neon:
   ```bash
   DATABASE_URL="postgres://...neon.tech/..." npm run db:migrate --workspace backend
   ```
5. Usa el *branching* de Neon para tener una base de datos de staging idéntica a producción sin duplicar datos manualmente.

## 2. Almacenamiento — Cloudflare R2

1. Crea un bucket R2 (p. ej. `memorias-vivas-media`).
2. Genera credenciales de API (Account API Token con permisos de R2) → `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY`.
3. `S3_ENDPOINT` = `https://<account_id>.r2.cloudflarestorage.com`, `S3_REGION=auto`, `S3_FORCE_PATH_STYLE=true`.
4. Activa acceso público al bucket (o un dominio personalizado vía Cloudflare) y usa esa URL como `S3_PUBLIC_BASE_URL` — es la que ven los clientes en `media.url`.
5. Configura CORS del bucket para permitir `PUT` desde el dominio del dashboard/app (necesario para las subidas directas vía presigned URL):
   ```json
   [{
     "AllowedOrigins": ["https://tu-dashboard.vercel.app"],
     "AllowedMethods": ["PUT"],
     "AllowedHeaders": ["Content-Type"]
   }]
   ```

## 3. Redis — Upstash

1. Crea una base Redis en Upstash (región cercana al backend).
2. Copia la URL de conexión (formato `rediss://...`) como `REDIS_URL`.
3. Tanto la API (que encola jobs) como el worker (`worker.ts`, que los consume) apuntan al mismo Redis.

## 4. Backend — Railway (ejemplo concreto)

Cualquier host de contenedores persistentes sirve; estos pasos son con Railway porque es el más directo para un monorepo con dos procesos.

1. Conecta el repo de GitHub a Railway.
2. Crea **dos servicios** desde el mismo repo, ambos con root directory `backend/`:
   - **`api`**: build `npm run build`, start `npm run start:prod`. Expón el puerto (Railway lo detecta vía `PORT`).
   - **`worker`**: mismo build, start `npm run worker:prod`. Sin puerto público — es un proceso en background.
3. Variables de entorno (mismas en ambos servicios, ver `.env.example`):
   `DATABASE_URL`, `REDIS_URL`, `S3_*`, `CLERK_SECRET_KEY`, `REPLICATE_API_TOKEN`, `REPLICATE_FACE_MODEL_VERSION`, `CORS_ORIGIN` (la URL del dashboard).
4. El servicio `worker` necesita `ffmpeg` en la imagen — si Railway no lo trae por defecto en su imagen base de Node, añade un `Dockerfile` que instale `ffmpeg` (`apt-get install -y ffmpeg`) antes de `npm run build`.
5. Anota la URL pública del servicio `api` (p. ej. `https://memorias-api.up.railway.app`) — la necesitas para el dashboard y la app móvil, tanto para `/trpc` como para el WebSocket `/chat` (mismo host, mismo puerto).

## 5. Panel de administración — Vercel

1. Importa el repo en Vercel, con **root directory `web-dashboard`**.
2. Framework preset: Next.js (detectado automáticamente).
3. Variables de entorno:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
   - `NEXT_PUBLIC_API_URL` = `https://memorias-api.up.railway.app/trpc`
   - `NEXT_PUBLIC_MAP_STYLE_URL` (opcional — por defecto usa el estilo de demo público de MapLibre)
4. Como es un workspace de npm, Vercel detecta automáticamente que debe instalar desde la raíz del repo; si no lo hace, fija el *Install Command* a `npm install` con *Root Directory* en la raíz y *Output Directory* en `web-dashboard/.next` (o usa el soporte nativo de Vercel para monorepos, indicando `web-dashboard` como proyecto).

## 6. Clerk

1. Crea una aplicación en el dashboard de Clerk.
2. Copia `Publishable key` / `Secret key` a las variables de entorno de backend y dashboard.
3. Añade el dominio de Vercel a los *allowed origins* de Clerk.
4. No hay webhooks de Clerk configurados en este esqueleto — el aprovisionamiento del usuario local es *just-in-time* en `GET /auth/me` (ver `AuthService.findOrCreateUser`), no vía webhook.

## 7. IA — Replicate

1. Genera un token de API en Replicate → `REPLICATE_API_TOKEN`.
2. Elige el modelo de reconocimiento facial/embeddings que vayas a usar y fija su hash de versión en `REPLICATE_FACE_MODEL_VERSION` (ver el comentario en `backend/src/ai/face-recognition.service.ts` — el adaptador asume una salida `{ faces, embedding }`; ajusta `parseOutput` si el modelo elegido devuelve otro formato).

## 8. CI — GitHub Actions

`.github/workflows/ci.yml` (añadido junto a esta guía) corre en cada push/PR:
typecheck de `backend` y `web-dashboard`, y un `next build` real del dashboard. No
despliega nada — el despliegue continuo lo gestionan Vercel (integración nativa con
GitHub) y Railway (o el proveedor que uses para el backend) de la misma forma.

## 9. App móvil — stores

`/mobile` no se "despliega" como los demás — se compila y se sube a las stores:

```bash
flutter build appbundle --dart-define=CLERK_PUBLISHABLE_KEY=... --dart-define=API_BASE_URL=https://memorias-api.up.railway.app/trpc   # Android
flutter build ipa       --dart-define=CLERK_PUBLISHABLE_KEY=... --dart-define=API_BASE_URL=https://memorias-api.up.railway.app/trpc   # iOS
```

Antes de compilar para producción, revisa el aviso de `/mobile/README.md`: ese
código no se compiló nunca en el entorno donde se escribió, así que necesita pasar
por `flutter pub get && flutter analyze` (y corregir lo que salga) antes de llegar
aquí.

## Checklist de variables de entorno

| Variable | Dónde | Origen |
|---|---|---|
| `DATABASE_URL` | backend | Neon |
| `REDIS_URL` | backend | Upstash |
| `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_FORCE_PATH_STYLE`, `S3_PUBLIC_BASE_URL` | backend | Cloudflare R2 |
| `CLERK_SECRET_KEY` | backend, dashboard | Clerk |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | dashboard | Clerk |
| `REPLICATE_API_TOKEN`, `REPLICATE_FACE_MODEL_VERSION` | backend | Replicate |
| `NEXT_PUBLIC_API_URL` | dashboard | URL pública del backend + `/trpc` |
| `NEXT_PUBLIC_MAP_STYLE_URL` | dashboard | Opcional — MapTiler/Stadia Maps en producción |
| `CORS_ORIGIN` | backend | URL del dashboard desplegado |
