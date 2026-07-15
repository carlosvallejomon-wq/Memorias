import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { resolveUserFromToken } from '../auth/resolve-user-from-token';
import { db } from '../db';
import type { User } from '../db/schema';

export interface TrpcContext {
  db: typeof db;
  user: User | null;
}

// El contexto de tRPC vive fuera del contenedor de Nest a propósito: el
// middleware de Express que expone /trpc se monta una sola vez en el
// bootstrap, así que reutiliza el cliente `db` singleton en vez de resolver
// providers vía DI en cada request.
function bearerToken(authHeader: string | undefined): string | undefined {
  return authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : undefined;
}

export async function createContext({ req }: CreateExpressContextOptions): Promise<TrpcContext> {
  const user = await resolveUserFromToken(bearerToken(req.headers.authorization));
  return { db, user };
}
