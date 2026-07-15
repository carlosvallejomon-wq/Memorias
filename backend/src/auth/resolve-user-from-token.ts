import { verifyToken } from '@clerk/backend';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users, type User } from '../db/schema';

// Compartido entre el contexto de tRPC y el gateway de WebSockets: ambos
// necesitan resolver "¿qué usuario local corresponde a este JWT de Clerk?"
// sin pasar por el contenedor de Nest.
export async function resolveUserFromToken(token: string | undefined): Promise<User | null> {
  if (!token) return null;

  try {
    const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY! });
    const existing = await db.query.users.findFirst({ where: eq(users.clerkId, payload.sub) });
    return existing ?? null;
  } catch {
    return null;
  }
}
