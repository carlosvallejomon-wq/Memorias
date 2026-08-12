# Memorias Vivas 📸

Álbumes compartidos de eventos (bodas, cumpleaños, viajes): el organizador
crea un álbum y comparte un enlace o código QR; los invitados suben fotos y
vídeos desde el móvil **sin instalar nada y sin registrarse**.

## Qué incluye

- **Panel del organizador** (`/dashboard`, con login de Clerk): crear álbumes,
  ver el QR y el enlace para compartir, **resumen del evento** (recuerdos,
  personas, reacciones, quién ha compartido más y el recuerdo más querido),
  proponer **retos fotográficos**, leer el **muro de mensajes**, borrar
  contenido, borrar el álbum, descargar todo en un ZIP y generar un **Dotbook
  digital en PDF** (una página por recuerdo, más las dedicatorias del muro;
  los vídeos y formatos no incrustables llevan un QR que enlaza al original).
- **Página del invitado** (`/a/<código>`, sin login): subir fotos y vídeos,
  galería, vista agrupada por días, **retos** que completar, **muro de
  mensajes**, filtros (mías, vídeos, más queridas, por persona), visor con
  navegación y descarga, reacciones (❤️ 😂 😮 👏) y comentarios.
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

> **Importante:** hay que volver a visitar `/api/setup` después de cada
> actualización que añada funciones nuevas (por ejemplo los retos y el muro de
> mensajes), porque es lo que crea las tablas nuevas. Si algo aparece vacío o
> da error tras actualizar, esa visita casi siempre lo arregla.

### 5. Probar

1. Abre `https://TU-APP.vercel.app` → **Entrar al panel** → inicia sesión.
2. Crea un álbum, descarga o muestra el QR, y ábrelo con el móvil:
   deberías poder subir una foto sin iniciar sesión.

## Límites

Para que el servicio (y la factura de almacenamiento) no se descontrolen:

- **150 MB** por archivo — un vídeo de móvil de varios minutos cabe de sobra.
- **5.000** recuerdos por álbum.
- **500** recuerdos por invitado y álbum.
- El **Dotbook** imprime como mucho **220** páginas de recuerdo; si el álbum
  es mayor, escoge una selección repartida de principio a fin del evento y lo
  dice en la última página. El álbum completo sigue estando entero.

## Añadir una portada de Dotbook

Hay **52 diseños** de portada, con seis para cada ocasión donde más se suele
querer elegir: **boda**, **quinceañera**, **bautizo**, **primera comunión**,
**fiesta infantil**, **baby shower**, **viajes** y **familia**. Para añadir
otro:

1. Deja el JPG en `public/dotbook-templates/` (proporción parecida a un
   folio, p. ej. 1057×1500).
2. Deja una miniatura del **mismo nombre** en
   `public/dotbook-templates/thumbs/` (124×160 va bien).
3. Añade una línea a `TEMPLATE_COVER_LIST` en `src/lib/dotbook-templates.ts`.

No hace falta calcular dónde va el título ni retocar el diseño: el diseño se
imprime entero, sin recortar, y el nombre del álbum va **debajo**, sobre el
papel, como en la cubierta de un libro de fotos. Así ningún diseño se queda
tapado, valga la proporción que valga.

## Si creas álbumes para otros (agencias y fotógrafos)

Cuando el álbum lo creas tú para un cliente —una agencia que organiza la boda,
un fotógrafo que lo incluye en su paquete—, el cliente no tiene cuenta y no
puede entrar al panel. Pero la portada de su libro y su invitación son
decisiones suyas.

Para eso, en la página de cada álbum hay un **enlace para el dueño del
evento**. Se lo mandas y él, sin registrarse:

- elige el diseño de su invitación y escribe los datos de su evento;
- elige entre las 52 portadas y se descarga su libro las veces que quiera.

No ve el panel ni el resto de tus álbumes. El enlace va firmado, así que no lo
puede adivinar un invitado que tenga el QR, y respeta el código de acceso y la
fecha de borrado si los has puesto.

## Dos ajustes opcionales por álbum

Los dos vienen **apagados**. Si no los tocas, el álbum funciona como siempre:
se entra con el enlace y no caduca nunca.

- **Código de acceso**: 4 a 8 números. Si lo pones, hace falta teclearlo una
  vez en cada móvil. Se guarda cifrado y se comprueba en el servidor, así que
  no basta con saltarse la pantalla. Al cambiarlo o quitarlo, los permisos ya
  dados dejan de valer solos.
- **Borrado automático**: eliges tú la fecha. Se avisa a los invitados dentro
  del álbum según se acerca, para que descarguen lo que quieran, y ese día se
  borra todo sin vuelta atrás. Lo ejecuta una tarea diaria de Vercel
  (`vercel.json`); si quieres protegerla, añade la variable `CRON_SECRET`.

## Privacidad

Hay páginas de [privacidad](/legal/privacidad) y
[condiciones de uso](/legal/condiciones) enlazadas desde el pie de la
portada, y un aviso de consentimiento en la pantalla de subida. Los álbumes
no se indexan en buscadores: solo entra quien tiene el enlace.

Cada invitado puede borrar sus propias fotos, comentarios y mensajes desde el
móvil con el que los subió. Si cambia de teléfono, en la propia página del
álbum puede copiar su **código personal** y pegarlo en el nuevo para seguir
siendo el mismo.

## Desarrollo local (opcional, para programadores)

```bash
npm install
# .env.local con DATABASE_URL, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
# CLERK_SECRET_KEY y BLOB_READ_WRITE_TOKEN
npm run dev
```

Comprobaciones antes de subir un cambio:

```bash
npm run check   # reglas de estilo + tipos + pruebas
npm run build   # compilación real
```

GitHub ejecuta lo mismo en cada pull request
(`.github/workflows/comprobaciones.yml`), así que un fallo sale marcado en
rojo antes de fusionarlo.

## Estructura

```
src/app/page.tsx                  Portada
src/app/legal/                    Privacidad y condiciones de uso
src/app/dashboard/                Panel del organizador (Clerk)
src/app/a/[code]/                 Página pública del invitado
src/app/a/[code]/opengraph-image  Vista previa del enlace (WhatsApp)
src/app/api/blob-upload/          Tokens de subida directa + topes
src/app/api/guest/[code]/media/   Listar y registrar contenido (público)
src/app/api/guest/[code]/…        Retos y muro de mensajes (público)
src/app/api/media/[id]/…          Comentarios y reacciones (público)
src/app/api/comments/[id]/        Borrar mi propio comentario (público)
src/app/api/albums/[id]/download/ ZIP del álbum en streaming (el dueño)
src/app/api/albums/[id]/dotbook/  Dotbook digital en PDF (solo el dueño)
src/lib/prepare-upload.ts         HEIC→JPG y miniatura de vídeo, en el móvil
src/lib/zip-stream.ts             Escritor de ZIP sin cargarlo en memoria
src/lib/limits.ts                 Topes de subida
src/lib/build-dotbook.ts          Lógica de generación del PDF
src/app/api/setup/                Crea las tablas en Neon (idempotente)
src/db/                           Esquema Drizzle y conexión Postgres
src/proxy.ts                      Middleware de Clerk (solo /dashboard)
```
