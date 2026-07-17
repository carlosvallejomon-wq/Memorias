import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

let _db: NodePgDatabase<typeof schema> | null = null;
let _pool: Pool | null = null;

function isLocal(url: string) {
  return url.includes("localhost") || url.includes("127.0.0.1");
}

export function getPool(): Pool {
  if (!_pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("Falta la variable de entorno DATABASE_URL");
    _pool = new Pool({
      connectionString: url,
      max: 5,
      ssl: isLocal(url) ? undefined : { rejectUnauthorized: true },
    });
  }
  return _pool;
}

export function db(): NodePgDatabase<typeof schema> {
  if (!_db) {
    _db = drizzle(getPool(), { schema });
  }
  return _db;
}
