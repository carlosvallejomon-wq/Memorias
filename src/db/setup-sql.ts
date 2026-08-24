// SQL idempotente para crear el esquema. Se ejecuta visitando /api/setup
// una vez tras el despliegue (o tantas veces como se quiera: no rompe nada).
export const SETUP_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS albums (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id text NOT NULL,
    name text NOT NULL,
    kind text NOT NULL DEFAULT 'evento',
    event_date date,
    share_code text NOT NULL UNIQUE,
    moderation_enabled boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `ALTER TABLE albums ADD COLUMN IF NOT EXISTS moderation_enabled boolean NOT NULL DEFAULT false`,
  `ALTER TABLE albums ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'evento'`,
  `ALTER TABLE albums ADD COLUMN IF NOT EXISTS pin_hash text`,
  `ALTER TABLE albums ADD COLUMN IF NOT EXISTS expires_at timestamptz`,
  `CREATE TABLE IF NOT EXISTS purchases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id text NOT NULL,
    stripe_session_id text NOT NULL UNIQUE,
    status text NOT NULL DEFAULT 'pending',
    amount integer,
    album_id uuid REFERENCES albums(id) ON DELETE SET NULL,
    redeemed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS purchases_owner_status_idx ON purchases (owner_id, status)`,
  `CREATE TABLE IF NOT EXISTS challenges (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    album_id uuid NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
    title text NOT NULL,
    emoji text,
    position integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS challenges_album_idx ON challenges (album_id)`,
  `CREATE TABLE IF NOT EXISTS media (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    album_id uuid NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
    url text NOT NULL UNIQUE,
    pathname text,
    type text NOT NULL,
    uploader_name text,
    uploader_id text,
    approved boolean NOT NULL DEFAULT true,
    taken_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `ALTER TABLE media ADD COLUMN IF NOT EXISTS uploader_id text`,
  `ALTER TABLE media ADD COLUMN IF NOT EXISTS approved boolean NOT NULL DEFAULT true`,
  `ALTER TABLE media ADD COLUMN IF NOT EXISTS challenge_id uuid REFERENCES challenges(id) ON DELETE SET NULL`,
  `ALTER TABLE media ADD COLUMN IF NOT EXISTS poster_url text`,
  `CREATE INDEX IF NOT EXISTS media_album_idx ON media (album_id)`,
  `CREATE TABLE IF NOT EXISTS comments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    media_id uuid NOT NULL REFERENCES media(id) ON DELETE CASCADE,
    author_name text,
    body text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `ALTER TABLE comments ADD COLUMN IF NOT EXISTS guest_id text`,
  `CREATE INDEX IF NOT EXISTS comments_media_idx ON comments (media_id)`,
  `CREATE TABLE IF NOT EXISTS reactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    media_id uuid NOT NULL REFERENCES media(id) ON DELETE CASCADE,
    guest_id text NOT NULL,
    emoji text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS reactions_unique_idx ON reactions (media_id, guest_id, emoji)`,
  `CREATE TABLE IF NOT EXISTS guestbook_entries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    album_id uuid NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
    author_name text,
    guest_id text,
    body text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS guestbook_album_idx ON guestbook_entries (album_id)`,
  `CREATE TABLE IF NOT EXISTS invitation_rsvps (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    album_id uuid NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
    guest_name text NOT NULL,
    attending boolean NOT NULL,
    party_size integer NOT NULL DEFAULT 1,
    note text,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS invitation_rsvps_album_idx ON invitation_rsvps (album_id)`,
];
