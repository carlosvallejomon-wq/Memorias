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
imprimen como páginas de "Dedicatorias" al final del Dotbook. La columna
`kind` distingue las dedicatorias (`deseo`) de las **canciones** que piden
los invitados desde la invitación (`cancion`): comparten tabla porque son lo
mismo —un texto corto firmado— pero el Dotbook solo imprime las primeras.

**Invitación web interactiva**: la prepara el organizador en
`src/components/InvitationGenerator.tsx` y la ve el invitado en
`src/components/InvitationView.tsx`. Llega por dos caminos:

- `/invitacion?d=…` — el estado entero (`InvitationLinkState`, en
  `src/lib/invitation-link.ts`) serializado en la URL. No crea nada en el
  servidor, pero para cambiar algo hay que repartir un enlace nuevo. Sigue
  ahí porque los QR ya entregados apuntan aquí.
- `/i/<código del álbum>` — el estado guardado en la tabla `invitations`
  (una fila por álbum, el JSON entero en una columna `jsonb`, porque el
  formato crece con cada detalle nuevo y una columna por dato obligaría a
  migrar cada vez). **Es el camino normal**: se puede volver al editor,
  cambiar la fecha o las fotos y guardar otra vez sin que el QR deje de
  valer.

Guardar va por `POST /api/invitaciones/[code]`, que **no pasa por Clerk** a
propósito: el editor lo usan el panel y `/a/[code]/personalizar?k=…`, donde
el dueño del evento es cliente de una agencia y no tiene cuenta. El permiso
es el mismo token firmado del enlace privado (`clientToken`), que el panel
calcula por su cuenta. Las dos pantallas cargan lo guardado con
`cargarInvitacion()` y se lo pasan al editor, para que no se abra en blanco.

**Las fotos son de los dueños del evento, no del álbum.** Cuando se reparte
la invitación el álbum está vacío, así que el editor sube la foto de portada
(`fp`) y las de la galería (`fg`) con `kind: "invitacion"` en
`/api/blob-upload`: van a Blob como cualquier recuerdo pero **no se
registran**, así que no salen en la galería de los invitados ni gastan su
cupo. Si no se pone ninguna, la invitación cae a las del álbum y luego al
diseño de la plantilla. El editor tiene además una **vista previa** en un
móvil (`vista === "web"`), que abre la propia página en un iframe con
`abierto=1` para saltarse el sobre en cada refresco; sin ella los campos se
rellenaban a ciegas.

El diseño imita la **papelería impresa**, no una web: títulos manuscritos en
Pinyon Script (`.tipo-manuscrita`), rótulos en versalitas espaciadas
(`.rotulo`), fotos con paspartú blanco (`.marco-foto`), recuadros
ornamentales (`.cartucho`) y un **lacre dorado** dibujado a base de
degradados (`.lacre-oro`). La referencia son las invitaciones que circulan
por WhatsApp (invitafy, hamuqinti y similares); si se toca el estilo,
conviene volver a mirarlas. Pinyon Script y Playfair Display las carga ya
`ensureInvitationFonts()` para el lienzo del generador, así que la página no
pide nada aparte.

**Catálogo de plantillas** (`src/lib/invitation-styles.ts`): al principio
había una sola maqueta con siete paletas —cambiaba el color y poco más—, así
que ahora cada plantilla decide cinco cosas además de la paleta: cómo se
alternan los fondos (`bandas`: alternas, claras u oscuras), qué adorno se
repite (`motivo`: floral, botánico, déco, corazones, estrellas, lazo), cómo
se escriben los títulos (`titulos`: manuscrita o versalitas), con qué forma
se enmarca la foto de portada (`marco`: arco, óvalo o recto) y qué cae de
fondo (`lluvia`: pétalos, destellos o nada). Con eso, dos plantillas del
mismo color ya no se parecen. Añadir una es **añadir una entrada a
`PLANTILLAS`**: no hay imágenes que subir, porque los adornos están dibujados
en SVG (`src/components/InvitationOrnaments.tsx`) y se tiñen solos, y la
miniatura del selector (`InvitationTemplatePicker.tsx`) sale de la misma
definición, así que aparece sola y con su aspecto real.

El campo `iv` del enlace guarda el identificador de la plantilla.
`plantillaDe()` acepta también el nombre del evento a secas ("quince",
"boda"…), que es lo que traían los enlaces repartidos antes del catálogo, y
cae a la primera plantilla si no reconoce nada. La textura de papel
(`.papel`) son dos luces blancas, así que en las plantillas oscuras no se
pone: dejaba el fondo gris.

Al abrirla, el invitado ve un **sobre cerrado** con una tarjeta asomando y el
lacre con las iniciales del evento (`si`, o las del nombre si no se ponen), y
lo abre tocándolo: la solapa gira, la tarjeta sale y el lacre **se parte en
dos** (`.lacre-roto` son dos copias del mismo sello recortadas a media pieza,
que de cerrado se ven como una). Ese toque importa: es el gesto de usuario
que los navegadores exigen para dejar sonar la música (`ms`), así que la
canción arranca justo ahí y no antes. Dentro, y en este orden: portada con la
foto en un marco de arco, cuenta atrás de cuatro números separados por dos
puntos (`.cuenta-atras`, con los segundos latiendo), menciones a padres y
padrinos (`pd`, una línea por "Rol: Nombre"), una banda de foto a todo lo
ancho, **ceremonia** (`ce`/`ch`/`cm`) y **recepción** (`re`/`rh`/`rm`) por
separado con su hora y su mapa —si no se rellenan, cae al bloque "Fecha y
lugar" de siempre con `l`/`mp`—, cronología, código de vestimenta con
**paleta** (`pa`) y **colores a evitar** (`ev`), avisos de "a tomar en
cuenta" (`av`), **mesa de regalos** (`mr`) y datos de transferencia (`cl`,
con botón de copiar), **hospedaje** (`ho`), galería (`ga`), **sugerencias de
canciones** (`sc`), **buenos deseos** (`bd`) y hashtag (`hg`). De fondo caen
pétalos (`.petalo`), que desaparecen con `prefers-reduced-motion`.

Todas las secciones se ocultan solas si su campo va vacío: es así como el
organizador elige qué enseña, sin una lista de interruptores.

Cuidado al tocar `decodeInvitationLink`: `useSearchParams()` ya deshace el
porcentaje, así que el JSON llega tal cual. Antes se le pasaba otro
`decodeURIComponent` y eso reventaba cualquier invitación con un "%" en el
texto ("10% de descuento"), porque el segundo decodificado se encontraba un
escape a medias. Hay pruebas de eso en `src/lib/invitation-link.test.ts`.

Los nombres de color en castellano se traducen en la tabla `COLORES`;
`colorDe()` prueba primero el nombre entero y luego cada palabra, porque
"rosa palo" o "verde olivo" no están como una sola clave y el círculo salía
vacío. El nombre se imprime siempre debajo del círculo, así que un color
desconocido no deja la sección muda.

Los buenos deseos se guardan por `/api/guest/[code]/guestbook`, el mismo muro
de mensajes de siempre: acaban impresos en las páginas de dedicatorias del
Dotbook sin que nadie copie nada a mano. La galería del álbum y los deseos se
piden mientras el invitado mira el sobre, para que la portada ya tenga su
foto al abrirlo; si el álbum tiene código de acceso el portero responde 403 y
esas dos secciones sencillamente no aparecen.

Dos detalles que conviene no revertir: los botones flotantes (música y volver
arriba) van abajo a la **izquierda**, porque la esquina derecha ya la ocupa el
botón de soporte por WhatsApp y los tapaba; y la invitación clásica —la que
no marca "experiencia interactiva"— conserva su formulario de RSVP de
siempre, porque el nuevo va pintado con los colores del tema y allí no hay
tema. Las secciones aparecen al desplazar con `<Reveal>`
(`src/components/Reveal.tsx`, antes dentro de `LandingPieces`).

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
imprimen con su fotograma y un QR pequeño en la esquina. Cada foto se reduce
a `FOTO_MAX_PX` antes de incrustarla (con `sharp`): a resolución completa un
libro de 60 fotos pesaba 130 MB y lo lento era descargarlo, no generarlo.

**Portadas de plantilla** (`src/lib/dotbook-templates.ts`): catálogo
compartido por el generador del PDF y el selector del navegador — antes la
lista estaba duplicada y añadir una portada obligaba a tocar tres archivos.
Para añadir una: dejar el JPG en `public/dotbook-templates/`, una miniatura
del mismo nombre en `thumbs/`, y una línea en `TEMPLATE_COVER_LIST`.

La placa con el nombre del álbum **se coloca sola**: `huecoParaLaPlaca()`
analiza la imagen (con `sharp`) y busca el hueco libre del tamaño exacto de
la placa, probando también posiciones a izquierda y derecha. Tres detalles
que costaron varias vueltas y conviene no revertir: se mide el gradiente
*más* la distancia al color del papel (un título grande de color suave, el
"15 Years" rosa sobre crema, no tiene gradiente pero sí destaca del fondo);
se puntúa por el punto **más marcado** de la caja, no por la media (un
subtítulo fino promediado salía casi gratis y la placa se comía la primera
palabra); y el texto se centra en la placa, no en la página, porque la placa
puede acabar descentrada. El `band` de cada plantilla es solo el respaldo
por si el análisis falla.

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
`CLERK_SECRET_KEY`, `APP_SIGNING_SECRET`, `CRON_SECRET`,
`BLOB_READ_WRITE_TOKEN` (esta la inyecta Vercel al
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
