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
Dotbook PDF, resumen del evento, retos, muro de mensajes) · `/a/[code]`
página pública del invitado (galería, subida, vista por días, retos,
mensajes, filtros, visor con navegación/descarga, reacciones ❤️😂😮👏,
comentarios). Los invitados se identifican con un UUID anónimo en
localStorage (`mv_guest_id`) y un nombre opcional.

**Retos fotográficos** (tabla `challenges` + `media.challenge_id`): el
organizador propone misiones ("el brindis", "el mejor baile") desde el panel,
con una lista sugerida según el tipo de álbum (`SUGGESTED_CHALLENGES` en
`dashboard/actions.ts`). El invitado sube directamente a un reto y la foto
queda etiquetada; borrar un reto no borra las fotos (`ON DELETE SET NULL`).
`registerMedia` valida que el reto pertenezca al álbum antes de asociarlo.

**Muro de mensajes** (tabla `guestbook_entries`): dedicatorias sin foto. Cada
invitado puede borrar solo la suya (`/api/guestbook/[entryId]` con su
`guestId`); el organizador puede borrar cualquiera desde el panel. Se
imprimen como páginas de "Dedicatorias" al final del Dotbook.

**Preparación de archivos en el navegador** (`src/lib/prepare-upload.ts`):
antes de subir nada se convierten los HEIC del iPhone a JPG (con `heic-to`,
importado dinámicamente para que los ~3 MB de wasm solo los descargue quien
sube un HEIC) y se saca un fotograma de portada de los vídeos, que se sube
como blob aparte y se guarda en `media.poster_url`. Sin lo primero las fotos
de iPhone no se ven en Chrome ni en Android; sin lo segundo la galería
pintaba rectángulos negros. La miniatura se registra con un `UPDATE`
posterior al `onConflictDoNothing`, porque el webhook de Vercel puede ganarle
la carrera al cliente y él no la conoce.

**Acceso y caducidad, ambos opcionales y apagados por defecto**
(`albums.pin_hash`, `albums.expires_at`):
- *Código de acceso* (`src/lib/album-pin.ts`): 4–8 dígitos, guardado con
  scrypt. El permiso se recuerda en una cookie httpOnly firmada con HMAC sobre
  `albumId:pinHash` — así, cambiar o quitar el código invalida solo los
  permisos ya dados, sin tabla de sesiones. **La comprobación tiene que estar
  en el servidor**: `guardAlbum` (`src/lib/guest-guard.ts`) es el portero
  único de TODAS las rutas de invitado (media, retos, muro, blob-upload y la
  pantalla del salón). Si solo lo mirara el navegador, bastaría con pedir
  `/api/guest/[code]/media` a mano.
- *Fecha de borrado* (`src/lib/expiry.ts`): la elige el organizador; nula =
  no caduca nunca. El álbum se cierra en cuanto pasa la fecha (aunque la
  limpieza no haya corrido) y `/api/cron/limpieza` —Vercel cron diario, ver
  `vercel.json`— borra fila y blobs. Se borra la fila ANTES que los archivos:
  si Blob falla, el álbum ya es inaccesible y la siguiente pasada no lo
  reintenta en bucle; los archivos huérfanos se cuentan aparte en la
  respuesta, porque contarlos como "no borrado" hacía creer que no se había
  hecho nada.

**Topes de subida** (`src/lib/limits.ts`, validados en
`onBeforeGenerateToken`): 150 MB por archivo, 5.000 recuerdos por álbum y 500
por invitado. Es el único momento en que se puede decir que no, porque
después el archivo va del móvil a Blob sin pasar por el servidor.

**Descarga ZIP en streaming** (`src/lib/zip-stream.ts`): escritor de ZIP
propio (método "store" + descriptor de datos) que va escribiendo archivo a
archivo según los descarga. Antes se juntaba el álbum entero en memoria con
JSZip y una boda de 2 GB tumbaba la función. Un archivo que falle se salta y
el resto del ZIP sigue.

**Dotbook**: tope de `MAX_DOTBOOK_PAGES` (220) páginas de recuerdo; si el
álbum es mayor se escoge una selección repartida de principio a fin
(`pickSpread`) y se avisa en la página de cierre. Los vídeos con miniatura se
imprimen con su fotograma y un QR pequeño en la esquina.

**Vista previa al compartir**: `generateMetadata` + `opengraph-image.tsx` en
`/a/[code]` generan la tarjeta que sale en WhatsApp con el nombre del álbum,
la fecha y sus últimas fotos. Solo se incrustan URLs absolutas (una relativa
hace fallar `next/og`) y hay un `try/catch` que cae a la tarjeta sin fotos.
Los álbumes llevan `robots: noindex`.

**Comprobaciones automáticas**: `npm run check` (lint + tipos + pruebas) y el
flujo `.github/workflows/comprobaciones.yml`. Las pruebas (`node:test` vía
`tsx --test`, archivos `*.test.ts` junto al código) cubren el escritor de
ZIP —comprobando con `unzip -t` que el archivo generado es válido—, los
nombres del ZIP, el detector de HEIC/vídeo y el límite de peticiones. Tres
reglas nuevas del compilador de React (`set-state-in-effect`, `purity`,
`static-components`) están en modo aviso a propósito: marcan patrones que
aquí son correctos (leer localStorage al montar, pedir datos en un efecto).

**Estilos compartidos** (`globals.css`): clases `.btn`/`.btn-primary`/
`.btn-soft`/`.btn-ghost`/`.btn-on-dark`, `.chip`, `.field`, `.skeleton`,
`.nota`, `.scroll-x`, foco visible global y respeto de
`prefers-reduced-motion`. Usarlas en pantallas nuevas en vez de repetir
ristras de utilidades de Tailwind.

Cuidado con `useElementWidth` (`src/lib/justified-layout.ts`): usa una ref de
función a propósito, porque el contenedor de la galería se desmonta al
cambiar de pestaña y con `useRef` + `useEffect` el observador se quedaba
midiendo 0 y la galería salía vacía.

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

Cada vez que se añada una tabla o columna hay que volver a visitar
`/api/setup` en producción (el SQL es idempotente). Sin esa visita la app
falla en cuanto toca las tablas nuevas — avisarlo siempre al usuario.

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
comentarios, contadores, carga por tandas, miniaturas de vídeo, código
personal del invitado, avisos, páginas legales y vista previa al compartir).

**Pendiente de verificar en producción** — es lo más importante que queda:
despliegue en Vercel, `/api/setup` contra Neon (hay columnas nuevas:
`media.poster_url` y `comments.guest_id`), login Clerk en `/dashboard`,
subida real a Blob desde un iPhone (para confirmar la conversión HEIC) y
desde Android, descarga ZIP de un álbum grande, y la vista previa del enlace
al pegarlo en WhatsApp.

Queda sin hacer, a sabiendas: no hay servicio externo de registro de errores
— solo `console.error` y las páginas `error.tsx` / `not-found.tsx`.
