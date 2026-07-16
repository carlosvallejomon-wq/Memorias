# Memorias Vivas 📸

Álbumes compartidos de eventos (bodas, cumpleaños, viajes): el organizador
crea un álbum y comparte un enlace o código QR; los invitados suben fotos y
vídeos desde el móvil **sin instalar nada y sin registrarse**.

## Qué incluye

- **Panel del organizador** (`/dashboard`, con login de Clerk): crear álbumes,
  ver el QR y el enlace para compartir, borrar contenido, borrar el álbum y
  descargar todo en un ZIP.
- **Página del invitado** (`/a/<código>`, sin login): subir fotos y vídeos,
  galería, vista agrupada por días, reacciones (❤️ 😂 😮 👏) y comentarios.
- Una sola app **Next.js**, desplegada en **Vercel**, con base de datos en
  **Neon** (Postgres) y archivos en **Vercel Blob**.

## Cómo desplegarla en Vercel (sin usar la terminal)

### 1. Importar el proyecto

1. Entra en [vercel.com](https://vercel.com) con tu cuenta.
2. **Add New → Project** → elige el repositorio `Memorias` → **Import**.
3. No cambies ninguna opción de build: Vercel detecta Next.js solo.

### 2. Conectar el almacenamiento de archivos (Vercel Blob)

1. En el proyecto de Vercel, pestaña **Storage** → **Create Database** →
   elige **Blob** → créalo y conéctalo al proyecto.
2. Esto añade solo la variable `BLOB_READ_WRITE_TOKEN`. No hay que copiar nada.

### 3. Variables de entorno

En el proyecto de Vercel → **Settings → Environment Variables**, añade:

| Variable | Dónde conseguirla |
|---|---|
| `DATABASE_URL` | En [Neon](https://neon.tech): tu proyecto → **Connection string** (elige la opción *Pooled connection*). |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | En [Clerk](https://dashboard.clerk.com): tu app → **API Keys** → *Publishable key*. |
| `CLERK_SECRET_KEY` | Mismo sitio → *Secret key*. |

### 4. Desplegar y preparar la base de datos

1. Pestaña **Deployments** → **Redeploy** (para que tome las variables).
2. Cuando termine, visita `https://TU-APP.vercel.app/api/setup` en el
   navegador **una sola vez**. Debe responder:
   `{"ok":true,"mensaje":"Base de datos lista..."}`.
   (Se puede visitar más veces sin peligro: no borra nada.)

### 5. Probar

1. Abre `https://TU-APP.vercel.app` → **Entrar al panel** → inicia sesión.
2. Crea un álbum, descarga o muestra el QR, y ábrelo con el móvil:
   deberías poder subir una foto sin iniciar sesión.

## Desarrollo local (opcional, para programadores)

```bash
npm install
# .env.local con DATABASE_URL, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
# CLERK_SECRET_KEY y BLOB_READ_WRITE_TOKEN
npm run dev
```

## Estructura

```
src/app/page.tsx                  Portada
src/app/dashboard/                Panel del organizador (Clerk)
src/app/a/[code]/                 Página pública del invitado
src/app/api/blob-upload/          Tokens de subida directa a Vercel Blob
src/app/api/guest/[code]/media/   Listar y registrar contenido (público)
src/app/api/media/[id]/…          Comentarios y reacciones (público)
src/app/api/albums/[id]/download/ ZIP del álbum (solo el dueño)
src/app/api/setup/                Crea las tablas en Neon (idempotente)
src/db/                           Esquema Drizzle y conexión Postgres
src/proxy.ts                      Middleware de Clerk (solo /dashboard)
```
