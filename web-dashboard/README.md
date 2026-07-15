# Memorias Vivas — Panel de administración

Next.js 15 (App Router) + TailwindCSS + Clerk + tRPC. Panel para el
organizador de un álbum: crear álbumes, ver estadísticas y moderar contenido.

## Arranque local

Requiere que `../backend` esté corriendo (`npm run start:dev` desde `/backend`).

```bash
cp .env.example .env.local   # completa las claves de Clerk
npm install                  # desde la raíz del repo (workspaces)
npm run dev --workspace web-dashboard
```

## Estructura

- `middleware.ts` — protege `/dashboard/*` con `clerkMiddleware`; el resto de
  rutas quedan públicas (la landing).
- `src/lib/trpc.ts` — cliente vanilla de tRPC (`createTRPCProxyClient`)
  tipado contra `AppRouter` del backend vía el alias de TS
  `memorias-backend/*` (import de solo-tipos: no se empaqueta código del
  backend en el frontend). Cada request adjunta el JWT de sesión de Clerk
  como `Authorization: Bearer`.
- `src/app/dashboard/page.tsx` — lista de álbumes del organizador + alta de
  álbum nuevo.
- `src/app/dashboard/[albumId]/page.tsx` — estadísticas (fotos, vídeos,
  mensajes, colaboradores distintos — no hay "visitas" porque el backend no
  trackea page views) y grid de moderación con borrado de contenido.
- `src/lib/e2ee.ts` — cifrado de extremo a extremo (AES-GCM 256 vía Web
  Crypto API) para álbumes de "Alta privacidad". La clave se genera al
  crear el álbum, se exporta como string y se guarda **solo** en
  `localStorage` de ese navegador (`src/lib/e2ee-key-storage.ts`) — nunca
  viaja al servidor. `src/components/E2eeKeyPanel.tsx` la muestra/permite
  copiarla o importarla en otro dispositivo; `EncryptedMedia.tsx` descarga
  el blob cifrado y lo descifra en memoria para poder mostrarlo.
  Verificado con un round-trip real (cifrar → exportar clave → reimportar
  → descifrar, y que una clave incorrecta falle) fuera del navegador, con
  el Web Crypto nativo de Node.

  **Nota de alcance**: este panel es de organizador/moderación, no de
  subida. El *cifrado en el momento de subir* (invitado sube una foto y el
  navegador la cifra antes del PUT a S3/R2) no tiene todavía una pantalla
  de invitado donde conectarse — `encryptBlob()` ya está listo para
  usarse ahí en cuanto exista esa vista.
- `src/app/dashboard/map/page.tsx` — mapa interactivo con MapLibre GL: todos
  los álbumes del organizador con latitud/longitud, agrupados en clusters
  (nativo de MapLibre, sin librería aparte) que se expanden al hacer clic o
  zoom; clic en un punto individual navega al álbum. `pitch: 45` da una
  vista inclinada — la aproximación "3D" razonable sin datos de terreno
  propios. El estilo del mapa es configurable vía
  `NEXT_PUBLIC_MAP_STYLE_URL` (por defecto, el estilo de demo público de
  MapLibre).

No incluye aún: gestión de invitados, generación de QR desde el panel.
