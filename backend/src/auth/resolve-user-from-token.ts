import { createClerkClient, verifyToken } from '@clerk/backend';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users, type User } from '../db/schema';

// Compartido entre el contexto de tRPC y el gateway de WebSockets: ambos
// necesitan resolver "¿qué usuario local corresponde a este JWT de Clerk?"
// sin pasar por el contenedor de Nest.
//
// Aprovisionamiento just-in-time: si el token es válido pero el usuario aún
// no existe en la tabla `users` (primera visita tras registrarse en Clerk),
// se crea aquí mismo. Sin esto, todo procedimiento protegido devolvía
// UNAUTHORIZED para usuarios nuevos hasta que algo llamara a GET /auth/me —
// y el panel web nunca lo llama.
export async function resolveUserFromToken(token: string | undefined): Promise<User | null> {
  if (!token) return null;

  try {
    const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY! });
    const existing = await db.query.users.findFirst({ where: eq(users.clerkId, payload.sub) });
    return existing ?? (await provisionUser(payload.sub));
  } catch {
    return null;
  }
}

async function provisionUser(clerkId: string): Promise<User | null> {
  const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
  const clerkUser = await clerkClient.users.getUser(clerkId);
  const primaryEmail =
    clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress;

  if (!primaryEmail) return null;

  // Dos requests simultáneas del mismo usuario nuevo pueden llegar aquí a la
  // vez; el índice único sobre clerk_id convierte la carrera en un no-op y
  // releemos la fila que haya quedado.
  const [created] = await db
    .insert(users)
    .values({
      clerkId,
      email: primaryEmail,
      name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || primaryEmail,
      avatarUrl: clerkUser.imageUrl,
    })
    .onConflictDoNothing({ target: users.clerkId })
    .returning();

  return created ?? (await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) })) ?? null;
}
