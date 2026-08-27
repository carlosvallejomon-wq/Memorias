import { getPool } from "@/db";

// Las invitaciones se estrenaron después de que ya existían álbumes en
// producción. Esta pequeña migración es idempotente y evita que el primer
// organizador dependa de abrir manualmente la ruta administrativa /api/setup.
let ready: Promise<void> | null = null;

export function ensureInvitationSchema() {
  if (!ready) {
    ready = (async () => {
      const pool = getPool();
      await pool.query(`CREATE TABLE IF NOT EXISTS invitations (
        album_id uuid PRIMARY KEY REFERENCES albums(id) ON DELETE CASCADE,
        data jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`);
      await pool.query(`CREATE TABLE IF NOT EXISTS invitation_rsvps (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        album_id uuid NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
        guest_name text NOT NULL,
        attending boolean NOT NULL,
        party_size integer NOT NULL DEFAULT 1,
        note text,
        created_at timestamptz NOT NULL DEFAULT now()
      )`);
      await pool.query(
        "CREATE INDEX IF NOT EXISTS invitation_rsvps_album_idx ON invitation_rsvps (album_id)",
      );
    })().catch((error) => {
      ready = null;
      throw error;
    });
  }
  return ready;
}
