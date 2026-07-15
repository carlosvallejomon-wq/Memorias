import { relations } from 'drizzle-orm';
import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  boolean,
  doublePrecision,
  json,
  integer,
  uuid,
  index,
  uniqueIndex,
  vector,
} from 'drizzle-orm/pg-core';

// Dimensión de los embeddings faciales/semánticos. 512 coincide con los
// modelos de reconocimiento facial habituales (ej. ArcFace / FaceNet).
const EMBEDDING_DIMENSIONS = 512;

export const mediaTypeEnum = pgEnum('media_type', ['IMAGE', 'VIDEO']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  // El id de Clerk es la fuente de verdad de identidad; lo indexamos aparte
  // del uuid interno para no acoplar el resto del esquema al proveedor de auth.
  clerkId: text('clerk_id').notNull().unique(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const albums = pgTable(
  'albums',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    description: text('description'),
    eventDate: timestamp('event_date').notNull(),
    location: text('location'),
    latitude: doublePrecision('latitude'),
    longitude: doublePrecision('longitude'),
    isE2ee: boolean('is_e2ee').default(false).notNull(),
    // Token opaco usado en los enlaces mágicos / QR de invitación.
    accessToken: text('access_token').unique().notNull(),
    qrCodeUrl: text('qr_code_url'),
    // Última versión del vídeo resumen generado por el worker de BullMQ.
    highlightReelUrl: text('highlight_reel_url'),
    createdBy: uuid('created_by')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('albums_access_token_idx').on(table.accessToken),
    index('albums_created_by_idx').on(table.createdBy),
    index('albums_location_idx').on(table.latitude, table.longitude),
  ],
);

export const media = pgTable(
  'media',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    albumId: uuid('album_id')
      .references(() => albums.id, { onDelete: 'cascade' })
      .notNull(),
    type: mediaTypeEnum('type').notNull(),
    url: text('url').notNull(),
    thumbnailUrl: text('thumbnail_url'),
    exifDate: timestamp('exif_date'),
    description: text('description'),
    // Coordenadas de rostros detectados: [{ x, y, w, h, personId? }, ...]
    faces: json('faces').$type<Array<{ x: number; y: number; w: number; h: number; personId?: string }>>(),
    likes: integer('likes').default(0).notNull(),
    // Nombre del invitado anónimo, o el uuid de un usuario registrado.
    uploadedBy: text('uploaded_by'),
    // Embedding vectorial (pgvector) para búsqueda semántica ("foto de la abuela en la playa").
    embedding: vector('embedding', { dimensions: EMBEDDING_DIMENSIONS }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('media_album_id_idx').on(table.albumId),
    index('media_exif_date_idx').on(table.exifDate),
    index('media_embedding_idx').using('hnsw', table.embedding.op('vector_cosine_ops')),
  ],
);

export const chatMessages = pgTable(
  'chat_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    albumId: uuid('album_id')
      .references(() => albums.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    guestName: text('guest_name'),
    content: text('content').notNull(),
    isEphemeral: boolean('is_ephemeral').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('chat_messages_album_id_idx').on(table.albumId),
    index('chat_messages_created_at_idx').on(table.createdAt),
  ],
);

// --- Relaciones (habilitan la query API de Drizzle: db.query.albums.findMany({ with: { media: true } })) ---

export const usersRelations = relations(users, ({ many }) => ({
  albums: many(albums),
  chatMessages: many(chatMessages),
}));

export const albumsRelations = relations(albums, ({ one, many }) => ({
  owner: one(users, {
    fields: [albums.createdBy],
    references: [users.id],
  }),
  media: many(media),
  chatMessages: many(chatMessages),
}));

export const mediaRelations = relations(media, ({ one }) => ({
  album: one(albums, {
    fields: [media.albumId],
    references: [albums.id],
  }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  album: one(albums, {
    fields: [chatMessages.albumId],
    references: [albums.id],
  }),
  author: one(users, {
    fields: [chatMessages.userId],
    references: [users.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Album = typeof albums.$inferSelect;
export type NewAlbum = typeof albums.$inferInsert;
export type Media = typeof media.$inferSelect;
export type NewMedia = typeof media.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
