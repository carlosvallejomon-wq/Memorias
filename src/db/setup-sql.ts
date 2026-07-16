// SQL idempotente para crear el esquema. Se ejecuta visitando /api/setup
// una vez tras el despliegue (o tantas veces como se quiera: no rompe nada).
export const SETUP_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS albums (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id text NOT NULL,
    name text NOT NULL,
    event_date date,
    share_code text NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS media (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    album_id uuid NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
    url text NOT NULL UNIQUE,
    pathname text,
    type text NOT NULL,
    uploader_name text,
    taken_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS media_album_idx ON media (album_id)`,
  `CREATE TABLE IF NOT EXISTS comments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    media_id uuid NOT NULL REFERENCES media(id) ON DELETE CASCADE,
    author_name text,
    body text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS comments_media_idx ON comments (media_id)`,
  `CREATE TABLE IF NOT EXISTS reactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    media_id uuid NOT NULL REFERENCES media(id) ON DELETE CASCADE,
    guest_id text NOT NULL,
    emoji text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS reactions_unique_idx ON reactions (media_id, guest_id, emoji)`,
];
