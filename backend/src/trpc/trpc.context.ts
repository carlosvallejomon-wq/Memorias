import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { verifyToken } from '@clerk/backend';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users, type User } from '../db/schema';

export interface TrpcContext {
  db: typeof db;
  user: User | null;
}

// El contexto de tRPC vive fuera del contenedor de Nest a propósito: el
// middleware de Express que expone /trpc se monta una sola vez en el
// bootstrap, así que reutiliza el cliente `db` singleton en vez de resolver
// providers vía DI en cada request.
async function resolveUser(authHeader: string | undefined): Promise<User | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length);

  try {
    const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY! });
    const existing = await db.query.users.findFirst({ where: eq(users.clerkId, payload.sub) });
    return existing ?? null;
  } catch {
    return null;
  }
}

export async function createContext({ req }: CreateExpressContextOptions): Promise<TrpcContext> {
  const user = await resolveUser(req.headers.authorization);
  return { db, user };
}
