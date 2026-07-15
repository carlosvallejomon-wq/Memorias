import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClerkClient, type ClerkClient } from '@clerk/backend';
import { eq } from 'drizzle-orm';
import { DB } from '../db/db.module';
import type { Database } from '../db';
import { users, type User } from '../db/schema';

@Injectable()
export class AuthService {
  private readonly clerkClient: ClerkClient;

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly config: ConfigService,
  ) {
    this.clerkClient = createClerkClient({
      secretKey: this.config.getOrThrow<string>('CLERK_SECRET_KEY'),
    });
  }

  // Aprovisionamiento "just-in-time": la primera vez que un clerkId autenticado
  // llega a la API replicamos su perfil en la tabla `users` local, para poder
  // referenciarlo con claves foráneas propias (álbumes, chat, etc.) sin acoplar
  // el resto del esquema al proveedor de identidad.
  async findOrCreateUser(clerkId: string): Promise<User> {
    const existing = await this.db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
    });
    if (existing) return existing;

    const clerkUser = await this.clerkClient.users.getUser(clerkId);
    const primaryEmail = clerkUser.emailAddresses.find(
      (e) => e.id === clerkUser.primaryEmailAddressId,
    )?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;

    if (!primaryEmail) {
      throw new Error(`El usuario de Clerk ${clerkId} no tiene ningún email asociado`);
    }

    const [created] = await this.db
      .insert(users)
      .values({
        clerkId,
        email: primaryEmail,
        name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || primaryEmail,
        avatarUrl: clerkUser.imageUrl,
      })
      .returning();

    return created;
  }
}
