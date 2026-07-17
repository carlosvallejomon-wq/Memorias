import {
  pgTable,
  text,
  timestamp,
  uuid,
  date,
  boolean,
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

export const media = pgTable(
  "media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    albumId: uuid("album_id")
      .notNull()
      .references(() => albums.id, { onDelete: "cascade" }),
    url: text("url").notNull().unique(),
    pathname: text("pathname"),
    type: text("type").notNull(), // "image" | "video"
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
