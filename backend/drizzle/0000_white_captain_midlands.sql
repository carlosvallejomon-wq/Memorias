CREATE TYPE "public"."media_type" AS ENUM('IMAGE', 'VIDEO');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "albums" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"event_date" timestamp NOT NULL,
	"location" text,
	"latitude" double precision,
	"longitude" double precision,
	"is_e2ee" boolean DEFAULT false NOT NULL,
	"access_token" text NOT NULL,
	"qr_code_url" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "albums_access_token_unique" UNIQUE("access_token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"album_id" uuid NOT NULL,
	"user_id" uuid,
	"guest_name" text,
	"content" text NOT NULL,
	"is_ephemeral" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"album_id" uuid NOT NULL,
	"type" "media_type" NOT NULL,
	"url" text NOT NULL,
	"thumbnail_url" text,
	"exif_date" timestamp,
	"description" text,
	"faces" json,
	"likes" integer DEFAULT 0 NOT NULL,
	"uploaded_by" text,
	"embedding" vector(512),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" text NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"avatar_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "albums" ADD CONSTRAINT "albums_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_album_id_albums_id_fk" FOREIGN KEY ("album_id") REFERENCES "public"."albums"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "media" ADD CONSTRAINT "media_album_id_albums_id_fk" FOREIGN KEY ("album_id") REFERENCES "public"."albums"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "albums_access_token_idx" ON "albums" USING btree ("access_token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "albums_created_by_idx" ON "albums" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "albums_location_idx" ON "albums" USING btree ("latitude","longitude");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_messages_album_id_idx" ON "chat_messages" USING btree ("album_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_messages_created_at_idx" ON "chat_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "media_album_id_idx" ON "media" USING btree ("album_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "media_exif_date_idx" ON "media" USING btree ("exif_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "media_embedding_idx" ON "media" USING hnsw ("embedding" vector_cosine_ops);