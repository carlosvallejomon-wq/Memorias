# API de Memorias Vivas

Tres superficies distintas, todas servidas por el proceso `backend` (`src/main.ts`):

| Superficie | Base | Uso |
|---|---|---|
| tRPC | `POST/GET {API_URL}/{procedure}` (por defecto `http://localhost:3000/trpc`) | CRUD de álbumes y media |
| REST | `GET /auth/me` | Arranque de sesión tras el login de Clerk |
| WebSocket | `{API_URL}/chat` (namespace Socket.IO) | Chat en tiempo real por álbum |

Todo el contenido es privado por diseño: la API añade `X-Robots-Tag: noindex, nofollow` a todas las respuestas.

## Autenticación

Dos modelos conviven en la misma API:

- **Sesión (Clerk)**: cabecera `Authorization: Bearer <jwt-de-sesión-de-clerk>`. Usada por el organizador (`protectedProcedure`). El backend aprovisiona el usuario local la primera vez que ve un `clerkId` nuevo (ver `AuthService.findOrCreateUser`).
- **`accessToken` del álbum**: un token opaco por álbum (el del enlace mágico/QR), sin sesión. Usado por invitados (`publicProcedure`) para ver y subir contenido sin registrarse.

## Protocolo tRPC (sin batch)

No hay generación de código: cualquier cliente HTTP puede llamar a los procedimientos directamente.

- **Query**: `GET /{procedure}?input=<JSON codificado en la URL>` → `{"result":{"data": ... }}`
- **Mutation**: `POST /{procedure}` con el input como cuerpo JSON → `{"result":{"data": ... }}`
- **Error**: `{"error":{"message": "...", "code": "..."}}`

### `album.*`

| Procedimiento | Tipo | Auth | Input | Descripción |
|---|---|---|---|---|
| `album.create` | mutation | Clerk | `{ title, eventDate, description?, location?, latitude?, longitude?, isE2ee? }` | Crea un álbum; genera el `accessToken` del enlace mágico. |
| `album.listMine` | query | Clerk | — | Álbumes del usuario autenticado. |
| `album.getById` | query | Clerk (dueño) | `{ albumId }` | Detalle de un álbum propio (usado por el panel para saber si `isE2ee`). |
| `album.getByAccessToken` | query | pública | `{ accessToken }` | Álbum + su `media`, para la vista de invitado. |
| `album.stats` | query | Clerk (dueño) | `{ albumId }` | `{ totalPhotos, totalVideos, totalMessages, uniqueContributors, lastActivityAt }`. No incluye "visitas": no hay tracking de páginas vistas. |

### `media.*`

| Procedimiento | Tipo | Auth | Input | Descripción |
|---|---|---|---|---|
| `media.requestUploadUrl` | mutation | pública (accessToken) | `{ accessToken, contentType }` | Paso 1 de la subida: firma una URL PUT a S3/R2. `contentType` debe ser uno de `image/jpeg`, `image/png`, `image/heic`, `video/mp4`, `video/quicktime`. Devuelve `{ uploadUrl, key, mediaType }`. |
| `media.confirmUpload` | mutation | pública (accessToken) | `{ accessToken, key, mediaType, exifDate?, description?, guestName? }` | Paso 2: registra el `media` tras subir el binario a `uploadUrl`. Encola el procesado de IA (reconocimiento facial + embedding) si es una imagen. |
| `media.listByAlbum` | query | Clerk (dueño) | `{ albumId }` | Listado para moderación. |
| `media.remove` | mutation | Clerk (dueño) | `{ mediaId }` | Borra el registro y el fichero en el bucket. |

**Subida de un fichero, paso a paso:**

```
1. POST media.requestUploadUrl { accessToken, contentType }
   -> { uploadUrl, key, mediaType }
2. PUT <uploadUrl>   body: los bytes del fichero
   Header Content-Type: EXACTAMENTE el mismo valor que en el paso 1
   (si no coincide, S3/R2 rechaza la subida por firma inválida)
3. POST media.confirmUpload { accessToken, key, mediaType, guestName? }
   -> el objeto `media` creado
```

Para álbumes con `isE2ee: true`, el paso 2 sube el *ciphertext* (ver `web-dashboard/src/lib/e2ee.ts` / `mobile/lib/services/e2ee_service.dart`) — el `contentType` declarado en el paso 1 sigue siendo el original (p. ej. `image/jpeg`), no `application/octet-stream`, porque debe coincidir con lo firmado.

### `GET /auth/me`

Requiere `Authorization: Bearer <jwt-de-clerk>`. Devuelve el usuario local, creándolo si es la primera vez que se ve ese `clerkId`. Los clientes lo llaman justo tras el login.

## WebSocket — namespace `/chat`

Cada álbum es una *room* de Socket.IO identificada por su `id` interno.

**Cliente → servidor:**

| Evento | Payload | Descripción |
|---|---|---|
| `join` | `{ accessToken }` | Une el socket a la room del álbum. Responde con `history`. |
| `message` | `{ accessToken, content, guestName?, authToken?, isEphemeral? }` | Envía un mensaje. Si `authToken` (JWT de Clerk) resuelve a un usuario, el mensaje queda firmado como suyo; si no, como `guestName`. Los mensajes `isEphemeral: true` se autoborran a las 24h (job de BullMQ con delay). |

**Servidor → cliente:**

| Evento | Payload | Descripción |
|---|---|---|
| `history` | `ChatMessage[]` | Últimos 50 mensajes del álbum, al hacer `join`. |
| `message` | `ChatMessage` | Broadcast a toda la room cuando alguien envía un mensaje. |
| `error` | `{ message, issues? }` | Validación fallida o álbum no encontrado. |

## Modelos (forma JSON)

```ts
Album {
  id, title, description, eventDate, location,
  latitude, longitude, isE2ee, accessToken, qrCodeUrl,
  highlightReelUrl, createdBy, createdAt
}

Media {
  id, albumId, type: 'IMAGE' | 'VIDEO', url, thumbnailUrl,
  exifDate, description, faces, likes, uploadedBy, createdAt
  // `embedding` (vector pgvector) no se serializa al cliente
}

ChatMessage {
  id, albumId, userId, guestName, content, isEphemeral, createdAt
}
```
