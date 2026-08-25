import {
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  date,
  boolean,
  integer,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const albums = pgTable("albums", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: text("owner_id").notNull(),
  name: text("name").notNull(),
  kind: text("kind").notNull().default("evento"), // "evento" | "familia"
  eventDate: date("event_date"),
  shareCode: text("share_code").notNull().unique(),
  moderationEnabled: boolean("moderation_enabled").notNull().default(false),
  // Código de acceso OPCIONAL. Nulo = el álbum se abre con el enlace, como
  // siempre. Se guarda cifrado (scrypt), no en claro.
  pinHash: text("pin_hash"),
  // Fecha OPCIONAL de borrado automático, elegida por el organizador. Nula =
  // el álbum no caduca nunca, que es lo que pasa si no toca nada.
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Cada pago se puede canjear por un solo álbum. Nunca confiamos en que el
// navegador vuelva desde Stripe: el webhook es quien confirma el pago.
export const purchases = pgTable(
  "purchases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id").notNull(),
    stripeSessionId: text("stripe_session_id").notNull(),
    status: text("status").notNull().default("pending"),
    amount: integer("amount"),
    albumId: uuid("album_id").references(() => albums.id, { onDelete: "set null" }),
    redeemedAt: timestamp("redeemed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("purchases_stripe_session_idx").on(t.stripeSessionId),
    index("purchases_owner_status_idx").on(t.ownerId, t.status),
  ],
);

// "Retos" fotográficos: pequeñas misiones que propone el organizador ("una
// foto con los novios", "el mejor baile") y que los invitados van
// completando. Sirven para que la gente suba fotos con intención en vez de
// mirar una galería vacía.
export const challenges = pgTable(
  "challenges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    albumId: uuid("album_id")
      .notNull()
      .references(() => albums.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    emoji: text("emoji"),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("challenges_album_idx").on(t.albumId)],
);

export const media = pgTable(
  "media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    albumId: uuid("album_id")
      .notNull()
      .references(() => albums.id, { onDelete: "cascade" }),
    // Reto al que responde la foto, si el invitado subió desde un reto. Al
    // borrar el reto las fotos se quedan en el álbum (set null).
    challengeId: uuid("challenge_id").references(() => challenges.id, {
      onDelete: "set null",
    }),
    url: text("url").notNull().unique(),
    pathname: text("pathname"),
    type: text("type").notNull(), // "image" | "video"
    // Fotograma de portada de los vídeos, generado en el navegador al subir.
    // Sin esto la galería enseñaba rectángulos negros hasta descargar el
    // vídeo entero.
    posterUrl: text("poster_url"),
    uploaderName: text("uploader_name"),
    uploaderId: text("uploader_id"),
    approved: boolean("approved").notNull().default(true),
    takenAt: timestamp("taken_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("media_album_idx").on(t.albumId)],
);

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mediaId: uuid("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "cascade" }),
    authorName: text("author_name"),
    // UUID anónimo de quien escribió, para que pueda borrar su propio
    // comentario igual que borra sus fotos.
    guestId: text("guest_id"),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("comments_media_idx").on(t.mediaId)],
);

export const reactions = pgTable(
  "reactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mediaId: uuid("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "cascade" }),
    guestId: text("guest_id").notNull(),
    emoji: text("emoji").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("reactions_unique_idx").on(t.mediaId, t.guestId, t.emoji)],
);

// Muro de mensajes (libro de firmas): dedicatorias sin foto, que además
// acaban impresas en el Dotbook.
export const guestbookEntries = pgTable(
  "guestbook_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    albumId: uuid("album_id")
      .notNull()
      .references(() => albums.id, { onDelete: "cascade" }),
    authorName: text("author_name"),
    guestId: text("guest_id"),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("guestbook_album_idx").on(t.albumId)],
);

// Confirmaciones enviadas desde la invitación. No requieren cuenta: el
// organizador comparte el enlace de la invitación y ve aquí la lista real de
// asistentes. Se mantienen separadas de los mensajes del muro porque una
// respuesta puede ser "no asistiré" y aun así resulta útil para el conteo.
export const invitationRsvps = pgTable(
  "invitation_rsvps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    albumId: uuid("album_id")
      .notNull()
      .references(() => albums.id, { onDelete: "cascade" }),
    guestName: text("guest_name").notNull(),
    attending: boolean("attending").notNull(),
    partySize: integer("party_size").notNull().default(1),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("invitation_rsvps_album_idx").on(t.albumId)],
);

// La invitación que prepara el organizador antes de repartirla. Una por
// álbum, guardada entera como JSON: el formato lo manda `InvitationLinkState`
// y cambia a menudo (cada detalle nuevo es un campo más), así que una tabla
// con una columna por dato obligaría a migrar el esquema cada vez.
//
// Guardarla es lo que permite prepararla en varias sentadas —subir las fotos
// de los novios hoy y escribir la cronología mañana— y que el enlace corto
// `/i/<código>` siga sirviendo lo último.
export const invitations = pgTable("invitations", {
  albumId: uuid("album_id")
    .primaryKey()
    .references(() => albums.id, { onDelete: "cascade" }),
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
