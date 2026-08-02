import {
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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

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
