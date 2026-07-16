# Memorias Vivas — contexto del proyecto

## Qué es esto

Una app para guardar y compartir fotos/vídeos de eventos (bodas, cumpleaños,
viajes), modelada sobre **Dots Memories** ([dotsmemories.app](https://dotsmemories.app)):
el organizador crea un álbum, genera un QR/enlace, y los invitados suben
fotos desde el móvil **sin instalar nada y sin registrarse**. El contenido se
ordena solo por fecha, todos pueden comentar/reaccionar, vista por días.
Más adelante: "Dotbook" (libro físico/PDF de recuerdos).

## Arquitectura actual (MVP simplificado, julio 2026)

Una sola app **Next.js** (App Router, Turbopack, Tailwind v4) en la raíz del
repo, desplegada en **Vercel**, con:

- **Neon** (Postgres) vía `pg` + Drizzle ORM (`src/db/`). El esquema se crea
  visitando `/api/setup` (SQL idempotente, sin drizzle-kit ni migraciones).
- **Vercel Blob** para fotos/vídeos, con subida directa desde el navegador
  del invitado (`@vercel/blob/client` + `/api/blob-upload`). El cliente
  registra el archivo en `/api/guest/[code]/media` tras subir; el webhook
  `onUploadCompleted` hace lo mismo en producción (la URL es única en BD,
  así que el doble registro no duplica).
- **Clerk** solo para el organizador. El middleware (`src/proxy.ts` —
  Next 16 renombró middleware→proxy) SOLO cubre `/dashboard` y
  `/api/albums`; las rutas de invitados jamás tocan Clerk. `ClerkProvider`
  vive en `src/app/dashboard/layout.tsx`, no en el layout raíz — importante,
  porque si Clerk envuelve las rutas públicas, con instancias de desarrollo
  redirige a los invitados al handshake de Clerk y rompe la página.

Rutas: `/` portada · `/dashboard` panel (crear/gestionar álbumes, QR, ZIP,
Dotbook PDF) · `/a/[code]` página pública del invitado (galería, subida,
vista por días, reacciones ❤️😂😮👏, comentarios). Los invitados se
identifican con un UUID anónimo en localStorage (`mv_guest_id`) y un nombre
opcional.

**Dotbook digital** (`/api/albums/[id]/dotbook`, lógica en
`src/lib/build-dotbook.ts`): genera un PDF con una página por recuerdo.
`pdf-lib` solo incrusta JPG/PNG directamente; para vídeos y formatos no
soportados (HEIC, etc.) la página lleva un QR (con la librería `qrcode`, ya
usada para compartir álbumes) que enlaza al archivo original en Blob — así
se replica el concepto del Dotbook físico de Dots Memories sin necesitar una
imprenta. Verificado end-to-end con un script que invoca `buildDotbookPdf`
directamente contra Postgres local (sin pasar por Clerk) y renderizando el
PDF resultante con el visor de Chromium vía Playwright, comprobando ambas
rutas: imagen incrustada y QR de respaldo.

Variables de entorno: `DATABASE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`,
`CLERK_SECRET_KEY`, `BLOB_READ_WRITE_TOKEN` (esta la inyecta Vercel al
conectar el Blob store). El README tiene la guía de despliegue paso a paso
pensada para el usuario (no programador).

## Historia: el pivote de arquitectura

La primera vuelta (historial de `main`, PRs #1–#10) seguía un prompt de otra
IA con arquitectura sobredimensionada: NestJS + tRPC + WebSockets + BullMQ +
Redis + reconocimiento facial + app Flutter + mapa 3D + cifrado E2E, en
Render + Vercel + Neon + Upstash + Clerk. Compilaba, pero generó una cadena
de bugs de despliegue y se abandonó por complejidad. Todo aquel código
(`/backend`, `/mobile`, `/web-dashboard`) se borró del árbol al empezar el
MVP simplificado; sigue disponible en el historial de git si hiciera falta
recuperar algo (p. ej. `web-dashboard/src/lib/e2ee.ts`).

## Cuentas ya creadas (no crear más sin necesidad)

- **Neon** (Postgres) — en uso.
- **Clerk** — en uso, solo para el organizador (los invitados nunca deben
  necesitar cuenta).
- **Vercel** — en uso; único destino de despliegue (app + Blob).
- **Render** y **Upstash** — ya no hacen falta. No pedir cuentas nuevas
  salvo necesidad estricta, explicando siempre el porqué.

## Repo y flujo de trabajo

- Repo: `carlosvallejomon-wq/Memorias`.
- El push directo desde la sesión de Claude Code **funciona**. Flujo
  normal: rama por feature → PR → merge a `main`.
- El usuario no es programador — no maneja bien la terminal de su PC.
  Prioriza soluciones que no requieran que él ejecute comandos en su
  máquina. Cuando algo sí lo requiera, guía paso a paso, un comando a la
  vez, esperando confirmación antes de seguir.
- Antes de dar por buena cualquier funcionalidad, verifícala de verdad
  (build real, arranque real, curl/Playwright) — no te fíes solo de que
  compile. En este entorno hay Postgres 16 local (`pg_ctlcluster 16 main
  start`) y Chromium para Playwright; el flujo de invitado completo se puede
  probar en local. Lo que NO se puede probar en local: login real de Clerk y
  subida real a Vercel Blob (requieren claves de producción) — verificar en
  el despliegue.

## Estado al momento de escribir esto

MVP implementado y verificado en local (build + servidor real + recorrido
Playwright del flujo de invitado: galería, vista por días, reacciones,
comentarios, contadores). Pendiente de verificar en producción: despliegue
en Vercel, `/api/setup` contra Neon, login Clerk en `/dashboard`, subida
real a Blob y descarga ZIP.
